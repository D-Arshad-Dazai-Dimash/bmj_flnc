using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Projects;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

public interface IApplicationService
{
    /// <summary>Список откликов на проект. Доступно только владельцу проекта.</summary>
    Task<IReadOnlyList<ApplicationListItemDto>> ListForProjectAsync(
        Guid projectId, Guid currentUserId, CancellationToken ct = default);

    /// <summary>
    /// Принять отклик. Назначает исполнителя проекту, переводит проект в InProgress,
    /// остальные Pending-отклики помечает Rejected и отправляет системное сообщение
    /// в чат с исполнителем.
    /// </summary>
    Task<ApplicationListItemDto> AcceptAsync(
        Guid applicationId, Guid currentUserId, CancellationToken ct = default);

    /// <summary>Отклонить отклик + системное сообщение в чат.</summary>
    Task<ApplicationListItemDto> RejectAsync(
        Guid applicationId, Guid currentUserId, CancellationToken ct = default);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

public sealed class ApplicationService : IApplicationService
{
    private readonly AppDbContext               _db;
    private readonly IChatService               _chat;
    private readonly ILogger<ApplicationService> _logger;

    public ApplicationService(AppDbContext db, IChatService chat, ILogger<ApplicationService> logger)
    {
        _db     = db;
        _chat   = chat;
        _logger = logger;
    }

    // ── Helpers ──────────────────────────────────────────────────

    private async Task<Project> EnsureProjectOwnerAsync(Guid projectId, Guid userId, CancellationToken ct)
    {
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new ApplicationServiceException("Проект не найден.", 404);

        var isOwner = await IsOwnerAsync(project.ClientProfileId, userId, ct);
        if (!isOwner)
            throw new ApplicationServiceException("Нет прав на этот проект.", 403);

        return project;
    }

    private async Task<bool> IsOwnerAsync(Guid profileId, Guid userId, CancellationToken ct)
    {
        var individual = await _db.Users.AsNoTracking()
            .AnyAsync(u => u.Id == userId && u.ProfileId == profileId, ct);
        if (individual) return true;

        return await _db.Memberships.AsNoTracking().AnyAsync(m =>
            m.ProfileId == profileId &&
            m.UserId    == userId    &&
            m.Status    == MembershipStatus.Active &&
            m.RoleInGroup == MembershipRole.Owner, ct);
    }

    private static string MapStatus(ApplicationStatus s) => s.ToString();

    private async Task<Guid?> FindThreadIdAsync(Guid p1, Guid p2, CancellationToken ct)
    {
        var (a, b) = p1.CompareTo(p2) <= 0 ? (p1, p2) : (p2, p1);
        return await _db.ChatThreads.AsNoTracking()
            .Where(t => t.Profile1Id == a && t.Profile2Id == b)
            .Select(t => (Guid?)t.Id)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<ApplicationListItemDto> ToDtoAsync(
        ProjectApplication app, Profile applicantProfile, Project project, CancellationToken ct)
    {
        var threadId = await FindThreadIdAsync(applicantProfile.Id, project.ClientProfileId, ct);
        return new ApplicationListItemDto(
            Id:                     app.Id,
            ProjectId:              app.ProjectId,
            ApplicantProfileId:     app.ApplicantProfileId,
            ApplicantProfileName:   applicantProfile.Name,
            ApplicantProfileLogoUrl:applicantProfile.LogoUrl,
            CoverLetter:            app.CoverLetter,
            ProposedBudget:         app.ProposedBudget,
            Status:                 MapStatus(app.Status),
            CreatedAt:              app.CreatedAt,
            ChatThreadId:           threadId
        );
    }

    // ── List ─────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ApplicationListItemDto>> ListForProjectAsync(
        Guid projectId, Guid currentUserId, CancellationToken ct = default)
    {
        var project = await EnsureProjectOwnerAsync(projectId, currentUserId, ct);

        var apps = await _db.ProjectApplications.AsNoTracking()
            .Where(a => a.ProjectId == projectId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

        if (apps.Count == 0) return Array.Empty<ApplicationListItemDto>();

        var profileIds = apps.Select(a => a.ApplicantProfileId).ToHashSet();
        var profiles = await _db.Profiles.AsNoTracking()
            .Where(p => profileIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        var result = new List<ApplicationListItemDto>(apps.Count);
        foreach (var a in apps)
        {
            if (!profiles.TryGetValue(a.ApplicantProfileId, out var prof)) continue;
            result.Add(await ToDtoAsync(a, prof, project, ct));
        }
        return result;
    }

    // ── Accept ───────────────────────────────────────────────────

    public async Task<ApplicationListItemDto> AcceptAsync(
        Guid applicationId, Guid currentUserId, CancellationToken ct = default)
    {
        var app = await _db.ProjectApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId, ct)
            ?? throw new ApplicationServiceException("Отклик не найден.", 404);

        var project = await EnsureProjectOwnerAsync(app.ProjectId, currentUserId, ct);

        if (app.Status == ApplicationStatus.Accepted)
        {
            var prof0 = await _db.Profiles.AsNoTracking()
                .FirstAsync(p => p.Id == app.ApplicantProfileId, ct);
            return await ToDtoAsync(app, prof0, project, ct);
        }
        if (app.Status != ApplicationStatus.Pending)
            throw new ApplicationServiceException(
                $"Нельзя принять отклик в статусе '{app.Status}'.");

        if (project.Status != ProjectStatus.Open && project.Status != ProjectStatus.InProgress)
            throw new ApplicationServiceException(
                $"Нельзя принимать отклики на проект в статусе '{project.Status}'.");

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        app.Status = ApplicationStatus.Accepted;
        project.ExecutorProfileId = app.ApplicantProfileId;
        project.Status = ProjectStatus.InProgress;

        // Прочие Pending — авто-Rejected
        var others = await _db.ProjectApplications
            .Where(a => a.ProjectId == app.ProjectId
                && a.Id != app.Id
                && a.Status == ApplicationStatus.Pending)
            .ToListAsync(ct);
        foreach (var o in others) o.Status = ApplicationStatus.Rejected;

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        _logger.LogInformation("Application {AppId} accepted on project {ProjectId}", app.Id, project.Id);

        // Системное сообщение в чат принятого исполнителя
        try
        {
            var thread = await _chat.EnsureThreadAsync(
                app.ApplicantProfileId, project.ClientProfileId, project.Id, ct);
            await _chat.SendSystemMessageAsync(
                thread.Id, project.ClientProfileId,
                $"Ваш отклик на проект «{project.Title}» принят. Можно приступать к работе.",
                project.Id, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Auto-system message (accept) failed for app {AppId}", app.Id);
        }

        // Отказы — тоже системные сообщения
        foreach (var o in others)
        {
            try
            {
                var t2 = await _chat.EnsureThreadAsync(o.ApplicantProfileId, project.ClientProfileId, project.Id, ct);
                await _chat.SendSystemMessageAsync(t2.Id, project.ClientProfileId,
                    $"К сожалению, на проект «{project.Title}» выбран другой исполнитель.",
                    project.Id, ct);
            }
            catch { /* best-effort */ }
        }

        var applicant = await _db.Profiles.AsNoTracking()
            .FirstAsync(p => p.Id == app.ApplicantProfileId, ct);
        return await ToDtoAsync(app, applicant, project, ct);
    }

    // ── Reject ───────────────────────────────────────────────────

    public async Task<ApplicationListItemDto> RejectAsync(
        Guid applicationId, Guid currentUserId, CancellationToken ct = default)
    {
        var app = await _db.ProjectApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId, ct)
            ?? throw new ApplicationServiceException("Отклик не найден.", 404);

        var project = await EnsureProjectOwnerAsync(app.ProjectId, currentUserId, ct);

        if (app.Status == ApplicationStatus.Rejected)
        {
            var prof0 = await _db.Profiles.AsNoTracking()
                .FirstAsync(p => p.Id == app.ApplicantProfileId, ct);
            return await ToDtoAsync(app, prof0, project, ct);
        }
        if (app.Status != ApplicationStatus.Pending)
            throw new ApplicationServiceException(
                $"Нельзя отклонить отклик в статусе '{app.Status}'.");

        app.Status = ApplicationStatus.Rejected;
        await _db.SaveChangesAsync(ct);

        try
        {
            var thread = await _chat.EnsureThreadAsync(
                app.ApplicantProfileId, project.ClientProfileId, project.Id, ct);
            await _chat.SendSystemMessageAsync(thread.Id, project.ClientProfileId,
                $"Заказчик отклонил отклик на проект «{project.Title}».",
                project.Id, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Auto-system message (reject) failed for app {AppId}", app.Id);
        }

        var applicant = await _db.Profiles.AsNoTracking()
            .FirstAsync(p => p.Id == app.ApplicantProfileId, ct);
        return await ToDtoAsync(app, applicant, project, ct);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEPTION
// ═══════════════════════════════════════════════════════════════════════════

public sealed class ApplicationServiceException : Exception
{
    public int StatusCode { get; }
    public ApplicationServiceException(string message, int statusCode = 400) : base(message)
    {
        StatusCode = statusCode;
    }
}
