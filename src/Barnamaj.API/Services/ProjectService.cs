using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Projects;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

public interface IProjectService
{
    /// <summary>
    /// Создаёт новый проект (ТЗ) от имени профиля-заказчика.
    /// Текущий пользователь должен быть Owner профиля.
    /// </summary>
    Task<ProjectDetailDto> CreateProjectAsync(
        CreateProjectDto dto,
        Guid currentUserId,
        CancellationToken ct = default);

    /// <summary>
    /// Публичная лента открытых проектов (Status = Open).
    /// Поддерживает пагинацию.
    /// </summary>
    Task<IReadOnlyList<ProjectSummaryDto>> GetFeedAsync(
        int page,
        int pageSize,
        CancellationToken ct = default);

    /// <summary>
    /// Подача заявки на выполнение проекта.
    /// Пользователь должен быть активным участником профиля-исполнителя.
    /// </summary>
    Task<ApplicationResponseDto> ApplyAsync(
        Guid projectId,
        ApplyToProjectDto dto,
        Guid currentUserId,
        CancellationToken ct = default);

    /// <summary>
    /// Возвращает проекты, принадлежащие текущему пользователю
    /// (где его профиль является ClientProfile).
    /// </summary>
    Task<IReadOnlyList<ProjectSummaryDto>> GetMyProjectsAsync(
        Guid currentUserId,
        CancellationToken ct = default);

    /// <summary>
    /// Изменяет статус проекта (отмена или завершение).
    /// Только Owner профиля-заказчика может менять статус.
    /// Допустимые переходы: Open/InProgress → Cancelled; InProgress → Completed.
    /// </summary>
    Task<ProjectSummaryDto> PatchStatusAsync(
        Guid projectId,
        string newStatus,
        Guid currentUserId,
        CancellationToken ct = default);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Сервис управления проектами Barnamaj.
///
/// Правила доступа:
///   Создание      — только Owner профиля-заказчика
///   Просмотр ленты — публично (без авторизации)
///   Подача заявки  — активный участник (Active) профиля-исполнителя
/// </summary>
public sealed class ProjectService : IProjectService
{
    private readonly AppDbContext           _db;
    private readonly ILogger<ProjectService> _logger;

    public ProjectService(AppDbContext db, ILogger<ProjectService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── CREATE PROJECT ────────────────────────────────────────
    public async Task<ProjectDetailDto> CreateProjectAsync(
        CreateProjectDto dto,
        Guid currentUserId,
        CancellationToken ct = default)
    {
        // 1. Проверяем, что профиль-заказчик существует
        var clientProfile = await _db.Profiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.ClientProfileId, ct);

        if (clientProfile is null)
            throw new ProjectException("Профиль заказчика не найден.", 404);

        // 2. Проверяем, что текущий пользователь — Owner этого профиля
        //    Для Individual-профиля: пользователь должен быть владельцем (profile_id в User)
        //    Для Company/Clan: активное членство с ролью Owner
        await EnsureOwnerAccessAsync(dto.ClientProfileId, currentUserId, clientProfile.AccountType, ct);

        // 3. Создаём проект
        var project = new Project
        {
            Title            = dto.Title.Trim(),
            Description      = dto.Description?.Trim(),
            Budget           = dto.Budget,
            Deadline         = dto.Deadline,
            Status           = ProjectStatus.Open,
            ClientProfileId  = dto.ClientProfileId,
            ExecutorProfileId = null,
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Project created: {ProjectId} [{Title}] by ClientProfile {ClientProfileId}",
            project.Id, project.Title, dto.ClientProfileId);

        return ToDetailDto(project, clientProfile, executor: null, applicationCount: 0);
    }

    // ── GET FEED ──────────────────────────────────────────────
    public async Task<IReadOnlyList<ProjectSummaryDto>> GetFeedAsync(
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        // Клампируем размер и номер страницы во избежание злоупотреблений
        pageSize = Math.Clamp(pageSize, 1, 50);
        page     = Math.Clamp(page, 1, 1000);

        var projects = await _db.Projects
            .AsNoTracking()
            .Include(p => p.ClientProfile)
            .Where(p => p.Status == ProjectStatus.Open)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                Project = p,
                AppCount = p.Applications.Count(a => a.Status == ApplicationStatus.Pending),
            })
            .ToListAsync(ct);

        return projects.Select(x => new ProjectSummaryDto(
            Id:                x.Project.Id,
            Title:             x.Project.Title,
            Description:       x.Project.Description,
            Budget:            x.Project.Budget,
            Deadline:          x.Project.Deadline,
            Status:            x.Project.Status.ToString(),
            ClientProfileName: x.Project.ClientProfile.Name,
            ClientProfileId:   x.Project.ClientProfileId,
            ClientProfileType: x.Project.ClientProfile.AccountType.ToString(),
            ApplicationCount:  x.AppCount,
            CreatedAt:         x.Project.CreatedAt
        )).ToList();
    }

    // ── GET MY PROJECTS ───────────────────────────────────────
    public async Task<IReadOnlyList<ProjectSummaryDto>> GetMyProjectsAsync(
        Guid currentUserId,
        CancellationToken ct = default)
    {
        // Находим profileId текущего пользователя
        var user = await _db.Users
            .AsNoTracking()
            .Select(u => new { u.Id, u.ProfileId })
            .FirstOrDefaultAsync(u => u.Id == currentUserId, ct);

        if (user is null)
            return Array.Empty<ProjectSummaryDto>();

        // Собираем все profileId, которыми владеет пользователь:
        // 1) его Individual-профиль
        // 2) Clan/Company, где он Owner
        var ownedProfileIds = new HashSet<Guid>();
        if (user.ProfileId.HasValue)
            ownedProfileIds.Add(user.ProfileId.Value);

        var clanOwnerIds = await _db.Memberships
            .AsNoTracking()
            .Where(m =>
                m.UserId      == currentUserId &&
                m.Status      == MembershipStatus.Active &&
                m.RoleInGroup == MembershipRole.Owner)
            .Select(m => m.ProfileId)
            .ToListAsync(ct);

        foreach (var id in clanOwnerIds)
            ownedProfileIds.Add(id);

        var projects = await _db.Projects
            .AsNoTracking()
            .Include(p => p.ClientProfile)
            .Where(p => ownedProfileIds.Contains(p.ClientProfileId))
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                Project  = p,
                AppCount = p.Applications.Count(a => a.Status == ApplicationStatus.Pending),
            })
            .ToListAsync(ct);

        return projects.Select(x => new ProjectSummaryDto(
            Id:                x.Project.Id,
            Title:             x.Project.Title,
            Description:       x.Project.Description,
            Budget:            x.Project.Budget,
            Deadline:          x.Project.Deadline,
            Status:            x.Project.Status.ToString(),
            ClientProfileName: x.Project.ClientProfile.Name,
            ClientProfileId:   x.Project.ClientProfileId,
            ClientProfileType: x.Project.ClientProfile.AccountType.ToString(),
            ApplicationCount:  x.AppCount,
            CreatedAt:         x.Project.CreatedAt
        )).ToList();
    }

    // ── PATCH STATUS ──────────────────────────────────────────
    public async Task<ProjectSummaryDto> PatchStatusAsync(
        Guid projectId,
        string newStatus,
        Guid currentUserId,
        CancellationToken ct = default)
    {
        if (!Enum.TryParse<ProjectStatus>(newStatus, ignoreCase: true, out var target))
            throw new ProjectException($"Недопустимый статус: '{newStatus}'.", 400);

        var project = await _db.Projects
            .Include(p => p.ClientProfile)
            .FirstOrDefaultAsync(p => p.Id == projectId, ct);

        if (project is null)
            throw new ProjectException("Проект не найден.", 404);

        // Проверяем право: только Owner заказчика
        await EnsureOwnerAccessAsync(project.ClientProfileId, currentUserId,
            project.ClientProfile.AccountType, ct);

        // Допустимые переходы
        var allowed = (project.Status, target) switch
        {
            (ProjectStatus.Open,       ProjectStatus.Cancelled)  => true,
            (ProjectStatus.InProgress, ProjectStatus.Cancelled)  => true,
            (ProjectStatus.InProgress, ProjectStatus.Completed)  => true,
            _ => false,
        };

        if (!allowed)
            throw new ProjectException(
                $"Переход '{project.Status}' → '{target}' не разрешён.", 400);

        project.Status    = target;
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Project {ProjectId} status changed to {Status} by user {UserId}",
            projectId, target, currentUserId);

        var appCount = await _db.ProjectApplications
            .CountAsync(a => a.ProjectId == projectId && a.Status == ApplicationStatus.Pending, ct);

        return new ProjectSummaryDto(
            Id:                project.Id,
            Title:             project.Title,
            Description:       project.Description,
            Budget:            project.Budget,
            Deadline:          project.Deadline,
            Status:            project.Status.ToString(),
            ClientProfileName: project.ClientProfile.Name,
            ClientProfileId:   project.ClientProfileId,
            ClientProfileType: project.ClientProfile.AccountType.ToString(),
            ApplicationCount:  appCount,
            CreatedAt:         project.CreatedAt
        );
    }

    // ── APPLY TO PROJECT ──────────────────────────────────────
    public async Task<ApplicationResponseDto> ApplyAsync(
        Guid projectId,
        ApplyToProjectDto dto,
        Guid currentUserId,
        CancellationToken ct = default)
    {
        // 1. Загружаем проект
        var project = await _db.Projects
            .AsNoTracking()
            .Include(p => p.ClientProfile)
            .FirstOrDefaultAsync(p => p.Id == projectId, ct);

        if (project is null)
            throw new ProjectException("Проект не найден.", 404);

        if (project.Status != ProjectStatus.Open)
            throw new ProjectException(
                $"Нельзя подать заявку на проект со статусом '{project.Status}'.");

        // 2. Загружаем профиль-исполнитель
        var applicantProfile = await _db.Profiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.ApplicantProfileId, ct);

        if (applicantProfile is null)
            throw new ProjectException("Профиль исполнителя не найден.", 404);

        // 3. Нельзя подавать заявку от своего же профиля-заказчика
        if (dto.ApplicantProfileId == project.ClientProfileId)
            throw new ProjectException("Заказчик не может подавать заявку на собственный проект.");

        // 4. Проверяем права: текущий пользователь должен быть активным участником
        //    профиля-исполнителя
        await EnsureMemberAccessAsync(dto.ApplicantProfileId, currentUserId, applicantProfile.AccountType, ct);

        // 5. Проверяем, нет ли уже заявки от этого профиля
        var existing = await _db.ProjectApplications
            .AsNoTracking()
            .FirstOrDefaultAsync(a =>
                a.ProjectId           == projectId &&
                a.ApplicantProfileId  == dto.ApplicantProfileId, ct);

        if (existing is not null)
        {
            var msg = existing.Status switch
            {
                ApplicationStatus.Pending  => "Вы уже подали заявку на этот проект.",
                ApplicationStatus.Accepted => "Ваша заявка уже принята.",
                ApplicationStatus.Rejected => "Ваша предыдущая заявка была отклонена. Повторная подача не разрешена.",
                _                          => "Заявка от данного профиля уже существует.",
            };
            throw new ProjectException(msg);
        }

        // 6. Создаём заявку
        var application = new ProjectApplication
        {
            ProjectId          = projectId,
            ApplicantProfileId = dto.ApplicantProfileId,
            CoverLetter        = dto.CoverLetter?.Trim(),
            ProposedBudget     = dto.ProposedBudget,
            Status             = ApplicationStatus.Pending,
        };

        _db.ProjectApplications.Add(application);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg
            && pg.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            // Гонка потоков: параллельный запрос успел создать заявку раньше
            throw new ProjectException("Вы уже подали заявку на этот проект.");
        }

        _logger.LogInformation(
            "Application submitted: {ApplicationId} by Profile {ProfileId} on Project {ProjectId}",
            application.Id, dto.ApplicantProfileId, projectId);

        return new ApplicationResponseDto(
            ApplicationId:       application.Id,
            ProjectId:           projectId,
            ProjectTitle:        project.Title,
            ApplicantProfileId:  dto.ApplicantProfileId,
            ApplicantProfileName:applicantProfile.Name,
            Status:              ApplicationStatus.Pending.ToString(),
            CreatedAt:           application.CreatedAt
        );
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// Проверяет, что пользователь является Owner профиля.
    /// Для Individual — Owner = тот пользователь, у которого profile_id совпадает.
    /// Для Company/Clan — активное Membership с RoleInGroup = Owner.
    /// </summary>
    private async Task EnsureOwnerAccessAsync(
        Guid profileId,
        Guid userId,
        AccountType profileType,
        CancellationToken ct)
    {
        if (profileType == AccountType.Individual)
        {
            var isOwner = await _db.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == userId && u.ProfileId == profileId, ct);

            if (!isOwner)
                throw new ProjectException(
                    "Вы можете создавать проекты только от своего профиля.", 403);
        }
        else
        {
            var membership = await _db.Memberships
                .AsNoTracking()
                .FirstOrDefaultAsync(m =>
                    m.ProfileId   == profileId &&
                    m.UserId      == userId    &&
                    m.Status      == MembershipStatus.Active &&
                    m.RoleInGroup == MembershipRole.Owner, ct);

            if (membership is null)
                throw new ProjectException(
                    "Только владелец (Owner) профиля может создавать проекты.", 403);
        }
    }

    /// <summary>
    /// Проверяет, что пользователь является активным участником профиля.
    /// Для Individual — сам пользователь.
    /// Для Company/Clan — активное Membership (любая роль).
    /// </summary>
    private async Task EnsureMemberAccessAsync(
        Guid profileId,
        Guid userId,
        AccountType profileType,
        CancellationToken ct)
    {
        if (profileType == AccountType.Individual)
        {
            var isOwner = await _db.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == userId && u.ProfileId == profileId, ct);

            if (!isOwner)
                throw new ProjectException(
                    "Вы можете подавать заявки только от своего профиля.", 403);
        }
        else
        {
            var isMember = await _db.Memberships
                .AsNoTracking()
                .AnyAsync(m =>
                    m.ProfileId == profileId &&
                    m.UserId    == userId    &&
                    m.Status    == MembershipStatus.Active, ct);

            if (!isMember)
                throw new ProjectException(
                    "Вы должны быть активным участником профиля для подачи заявки.", 403);
        }
    }

    // ── DTO BUILDERS ──────────────────────────────────────────
    private static ProjectDetailDto ToDetailDto(
        Project project,
        Profile client,
        Profile? executor,
        int applicationCount) =>
        new(
            Id:                  project.Id,
            Title:               project.Title,
            Description:         project.Description,
            Budget:              project.Budget,
            Deadline:            project.Deadline,
            Status:              project.Status.ToString(),
            ClientProfileId:     client.Id,
            ClientProfileName:   client.Name,
            ClientProfileType:   client.AccountType.ToString(),
            ExecutorProfileId:   executor?.Id,
            ExecutorProfileName: executor?.Name,
            ApplicationCount:    applicationCount,
            CreatedAt:           project.CreatedAt,
            UpdatedAt:           project.UpdatedAt
        );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEPTION
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Бизнес-исключение сервиса проектов.
/// StatusCode → HTTP-ответ в контроллере (400 / 403 / 404).
/// </summary>
public sealed class ProjectException : Exception
{
    public int StatusCode { get; }

    public ProjectException(string message, int statusCode = 400)
        : base(message)
    {
        StatusCode = statusCode;
    }
}
