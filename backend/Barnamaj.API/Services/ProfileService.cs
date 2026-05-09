using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Profiles;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

public interface IProfileService
{
    /// <summary>
    /// Создаёт новый профиль Clan или Company.
    /// Текущий пользователь автоматически добавляется как Owner.
    /// </summary>
    Task<ProfileSummaryDto> CreateProfileAsync(
        CreateProfileDto dto,
        Guid currentUserId,
        CancellationToken ct = default);

    /// <summary>
    /// Отправляет приглашение пользователю по email.
    /// Только Owner профиля может приглашать.
    /// </summary>
    Task<InviteResponseDto> InviteUserAsync(
        Guid profileId,
        InviteUserDto dto,
        Guid currentUserId,
        CancellationToken ct = default);

    /// <summary>
    /// Возвращает список кланов/компаний, в которых состоит пользователь
    /// (Active или Pending).
    /// </summary>
    Task<IReadOnlyList<MyTeamDto>> GetMyTeamsAsync(
        Guid currentUserId,
        CancellationToken ct = default);

    /// <summary>
    /// Публичный поиск профилей (кланы / компании).
    /// </summary>
    Task<IReadOnlyList<ProfileSummaryDto>> SearchAsync(
        string? query,
        CancellationToken ct = default);

    /// <summary>
    /// Публичный просмотр профиля по Id.
    /// Возвращает null, если не найден.
    /// </summary>
    Task<ProfileSummaryDto?> GetByIdAsync(
        Guid profileId,
        CancellationToken ct = default);

    /// <summary>Обновить социальные поля своего профиля.</summary>
    Task<ProfileSummaryDto> UpdateSocialAsync(
        Guid profileId,
        UpdateProfileSocialDto dto,
        CancellationToken ct = default);

    /// <summary>Закрепить / открепить проект в профиле (max 6).</summary>
    Task<IReadOnlyList<Guid>> TogglePinAsync(
        Guid profileId,
        Guid projectId,
        CancellationToken ct = default);

    /// <summary>Проекты, в которых этот профиль участвует как заказчик или исполнитель.</summary>
    Task<IReadOnlyList<ProfileProjectDto>> GetProjectsAsync(
        Guid profileId,
        int page,
        int pageSize,
        CancellationToken ct = default);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Сервис управления профилями кланов и компаний.
///
/// Правила доступа:
///   • Создаёт профиль — любой авторизованный пользователь
///   • Приглашает участников — только Owner данного профиля
///   • Список команд — любой авторизованный пользователь
/// </summary>
public sealed class ProfileService : IProfileService
{
    private readonly AppDbContext          _db;
    private readonly ILogger<ProfileService> _logger;

    public ProfileService(AppDbContext db, ILogger<ProfileService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── CREATE PROFILE ────────────────────────────────────────
    public async Task<ProfileSummaryDto> CreateProfileAsync(
        CreateProfileDto dto,
        Guid currentUserId,
        CancellationToken ct = default)
    {
        // Проверяем, что пользователь существует и активен
        var userExists = await _db.Users
            .AsNoTracking()
            .AnyAsync(u => u.Id == currentUserId && u.IsActive, ct);

        if (!userExists)
            throw new ProfileException("Пользователь не найден или заблокирован.");

        Profile? created = null;

        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                // 1. Создаём профиль
                var profile = new Profile
                {
                    Name        = dto.Name.Trim(),
                    Bio         = dto.Bio?.Trim(),
                    LogoUrl     = dto.LogoUrl?.Trim(),
                    AccountType = dto.AccountType,
                    IsVerified  = false,
                };
                _db.Profiles.Add(profile);

                // 2. Создатель сразу становится Owner
                var membership = new Membership
                {
                    UserId          = currentUserId,
                    Profile         = profile,
                    RoleInGroup     = MembershipRole.Owner,
                    Status          = MembershipStatus.Active,
                    JoinedAt        = DateTime.UtcNow,
                    InvitedByUserId = null,  // создатель — никем не приглашён
                };
                _db.Memberships.Add(membership);

                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                created = profile;
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        });

        _logger.LogInformation(
            "Profile created: {ProfileId} [{AccountType}] by User {UserId}",
            created!.Id, dto.AccountType, currentUserId);

        return ToSummaryDto(created!, memberCount: 1);
    }

    // ── INVITE USER ───────────────────────────────────────────
    public async Task<InviteResponseDto> InviteUserAsync(
        Guid profileId,
        InviteUserDto dto,
        Guid currentUserId,
        CancellationToken ct = default)
    {
        var emailLower = dto.Email.ToLowerInvariant();

        // 1. Загружаем профиль — он должен существовать и не быть удалён
        var profile = await _db.Profiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == profileId, ct);

        if (profile is null)
            throw new ProfileException("Профиль не найден.", statusCode: 404);

        // Individual-профили не имеют участников
        if (profile.AccountType == AccountType.Individual)
            throw new ProfileException("Нельзя приглашать участников в Individual-профиль.");

        // 2. Проверяем, что текущий пользователь — Owner данного профиля
        var callerMembership = await _db.Memberships
            .AsNoTracking()
            .FirstOrDefaultAsync(m =>
                m.ProfileId == profileId &&
                m.UserId    == currentUserId &&
                m.Status    == MembershipStatus.Active, ct);

        if (callerMembership is null)
            throw new ProfileException(
                "У вас нет доступа к этому профилю.", statusCode: 403);

        if (callerMembership.RoleInGroup != MembershipRole.Owner)
            throw new ProfileException(
                "Только владелец (Owner) может приглашать участников.", statusCode: 403);

        // 3. Ищем целевого пользователя по email
        var targetUser = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == emailLower && u.IsActive, ct);

        if (targetUser is null)
            throw new ProfileException(
                $"Пользователь с email '{dto.Email}' не найден.");

        // Нельзя приглашать самого себя
        if (targetUser.Id == currentUserId)
            throw new ProfileException("Нельзя пригласить самого себя.");

        // 4. Проверяем, нет ли уже членства (Active или Pending)
        var existingMembership = await _db.Memberships
            .AsNoTracking()
            .FirstOrDefaultAsync(m =>
                m.ProfileId == profileId &&
                m.UserId    == targetUser.Id, ct);

        if (existingMembership is not null)
        {
            var msg = existingMembership.Status switch
            {
                MembershipStatus.Active  => "Этот пользователь уже является участником.",
                MembershipStatus.Pending => "Этот пользователь уже получил приглашение и ещё не ответил.",
                MembershipStatus.Left    => null,   // можно пригласить снова
                MembershipStatus.Kicked  => "Этот пользователь был исключён из группы.",
                _                        => null,
            };

            if (msg is not null)
                throw new ProfileException(msg);

            // Повторное приглашение после Left — перезаписываем запись
            await _db.Memberships
                .Where(m => m.Id == existingMembership.Id)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(m => m.Status,          MembershipStatus.Pending)
                    .SetProperty(m => m.RoleInGroup,     MembershipRole.Member)
                    .SetProperty(m => m.JoinedAt,        (DateTime?)null)
                    .SetProperty(m => m.CreatedAt,       DateTime.UtcNow)
                    .SetProperty(m => m.InvitedByUserId, currentUserId), ct);

            _logger.LogInformation(
                "Re-invite: User {TargetId} → Profile {ProfileId} by {CallerId}",
                targetUser.Id, profileId, currentUserId);

            return new InviteResponseDto(
                existingMembership.Id,
                targetUser.Email,
                profile.Name,
                MembershipStatus.Pending.ToString());
        }

        // 5. Создаём новое Pending-приглашение
        var invitation = new Membership
        {
            UserId          = targetUser.Id,
            ProfileId       = profileId,
            RoleInGroup     = MembershipRole.Member,
            Status          = MembershipStatus.Pending,
            JoinedAt        = null,
            InvitedByUserId = currentUserId,
        };
        _db.Memberships.Add(invitation);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Invite sent: User {TargetId} ({Email}) → Profile {ProfileId} by {CallerId}",
            targetUser.Id, emailLower, profileId, currentUserId);

        return new InviteResponseDto(
            invitation.Id,
            targetUser.Email,
            profile.Name,
            MembershipStatus.Pending.ToString());
    }

    // ── GET MY TEAMS ──────────────────────────────────────────
    public async Task<IReadOnlyList<MyTeamDto>> GetMyTeamsAsync(
        Guid currentUserId,
        CancellationToken ct = default)
    {
        // Загружаем все членства пользователя (Active + Pending) вместе с профилями
        var memberships = await _db.Memberships
            .AsNoTracking()
            .Include(m => m.Profile)
            .Where(m =>
                m.UserId == currentUserId &&
                (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Pending))
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(ct);

        // Для каждого профиля подсчитываем количество активных участников
        var profileIds = memberships.Select(m => m.ProfileId).ToList();
        var memberCounts = await _db.Memberships
            .AsNoTracking()
            .Where(m => profileIds.Contains(m.ProfileId) && m.Status == MembershipStatus.Active)
            .GroupBy(m => m.ProfileId)
            .Select(g => new { ProfileId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ProfileId, x => x.Count, ct);

        return memberships.Select(m => new MyTeamDto(
            ProfileId:   m.ProfileId,
            Name:        m.Profile.Name,
            Bio:         m.Profile.Bio,
            LogoUrl:     m.Profile.LogoUrl,
            AccountType: m.Profile.AccountType.ToString(),
            IsVerified:  m.Profile.IsVerified,
            MyRole:      m.RoleInGroup.ToString(),
            Status:      m.Status.ToString(),
            JoinedAt:    m.JoinedAt,
            MemberCount: memberCounts.GetValueOrDefault(m.ProfileId, 0)
        )).ToList();
    }

    // ── SEARCH ────────────────────────────────────────────────
    public async Task<IReadOnlyList<ProfileSummaryDto>> SearchAsync(
        string? query,
        CancellationToken ct = default)
    {
        var q = _db.Profiles
            .AsNoTracking()
            .Where(p => p.AccountType == AccountType.Clan || p.AccountType == AccountType.Company);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lower = query.Trim().ToLowerInvariant();
            q = q.Where(p => p.Name.ToLower().Contains(lower) ||
                              (p.Bio != null && p.Bio.ToLower().Contains(lower)));
        }

        var profiles = await q
            .OrderByDescending(p => p.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        var profileIds = profiles.Select(p => p.Id).ToList();
        var memberCounts = await _db.Memberships
            .AsNoTracking()
            .Where(m => profileIds.Contains(m.ProfileId) && m.Status == MembershipStatus.Active)
            .GroupBy(m => m.ProfileId)
            .Select(g => new { ProfileId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ProfileId, x => x.Count, ct);

        return profiles
            .Select(p => ToSummaryDto(p, memberCounts.GetValueOrDefault(p.Id, 0)))
            .ToList();
    }

    // ── GET BY ID ─────────────────────────────────────────
    public async Task<ProfileSummaryDto?> GetByIdAsync(Guid profileId, CancellationToken ct = default)
    {
        var profile = await _db.Profiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == profileId, ct);
        if (profile is null) return null;

        var memberCount = await _db.Memberships
            .AsNoTracking()
            .CountAsync(m => m.ProfileId == profileId && m.Status == MembershipStatus.Active, ct);

        return ToSummaryDto(profile, memberCount);
    }

    // ── HELPERS ───────────────────────────────────────────────
    private const int MaxPinned = 6;

    private static ProfileSummaryDto ToSummaryDto(Profile p, int memberCount) =>
        new(
            Id:               p.Id,
            Name:             p.Name,
            Bio:              p.Bio,
            LogoUrl:          p.LogoUrl,
            AccountType:      p.AccountType.ToString(),
            IsVerified:       p.IsVerified,
            MemberCount:      memberCount,
            CreatedAt:        p.CreatedAt,
            CoverPresetId:    p.CoverPresetId,
            Status:           p.Status,
            PinnedProjectIds: ParsePinned(p.PinnedProjectIdsJson),
            AvgRating:        p.AvgRating,
            RatingsCount:     p.RatingsCount
        );

    private static IReadOnlyList<Guid> ParsePinned(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<Guid>();
        try
        {
            var arr = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(json);
            return arr is null ? Array.Empty<Guid>() : arr;
        }
        catch { return Array.Empty<Guid>(); }
    }

    private static string SerializePinned(IEnumerable<Guid> ids) =>
        System.Text.Json.JsonSerializer.Serialize(ids);

    // ── UPDATE SOCIAL ──────────────────────────────────────────
    public async Task<ProfileSummaryDto> UpdateSocialAsync(
        Guid profileId,
        UpdateProfileSocialDto dto,
        CancellationToken ct = default)
    {
        var profile = await _db.Profiles.FirstOrDefaultAsync(p => p.Id == profileId, ct)
            ?? throw new ProfileException("Профиль не найден.", 404);

        if (dto.Name is not null)
        {
            var name = dto.Name.Trim();
            if (name.Length is < 2 or > 256)
                throw new ProfileException("Имя должно быть от 2 до 256 символов.");
            profile.Name = name;
        }
        if (dto.Bio is not null)
        {
            var bio = dto.Bio.Trim();
            if (bio.Length > 2000) throw new ProfileException("Описание слишком длинное (до 2000).");
            profile.Bio = bio.Length == 0 ? null : bio;
        }
        if (dto.Status is not null)
        {
            var status = dto.Status.Trim();
            if (status.Length > 80) throw new ProfileException("Статус до 80 символов.");
            profile.Status = status.Length == 0 ? null : status;
        }
        if (dto.LogoUrl is not null)
        {
            var url = dto.LogoUrl.Trim();
            if (url.Length > 2048) throw new ProfileException("URL слишком длинный.");
            profile.LogoUrl = url.Length == 0 ? null : url;
        }
        if (dto.CoverPresetId is { } cover)
        {
            if (cover < 0 || cover > 9)
                throw new ProfileException("Пресет обложки — число 0..9.");
            profile.CoverPresetId = cover;
        }

        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        var memberCount = await _db.Memberships.AsNoTracking()
            .CountAsync(m => m.ProfileId == profileId && m.Status == MembershipStatus.Active, ct);
        return ToSummaryDto(profile, memberCount);
    }

    // ── TOGGLE PIN ────────────────────────────────────────────────
    public async Task<IReadOnlyList<Guid>> TogglePinAsync(
        Guid profileId,
        Guid projectId,
        CancellationToken ct = default)
    {
        var profile = await _db.Profiles.FirstOrDefaultAsync(p => p.Id == profileId, ct)
            ?? throw new ProfileException("Профиль не найден.", 404);

        // Проверяем что проект имеет отношение к профилю (заказчик / исполнитель).
        var related = await _db.Projects.AsNoTracking().AnyAsync(p =>
            p.Id == projectId &&
            (p.ClientProfileId == profileId || p.ExecutorProfileId == profileId), ct);
        if (!related)
            throw new ProfileException("Проект не принадлежит этому профилю.", 400);

        var current = ParsePinned(profile.PinnedProjectIdsJson).ToList();
        if (current.Contains(projectId))
            current.Remove(projectId);
        else
        {
            if (current.Count >= MaxPinned)
                throw new ProfileException($"Можно закрепить не больше {MaxPinned} проектов.");
            current.Insert(0, projectId);
        }

        profile.PinnedProjectIdsJson = SerializePinned(current);
        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return current;
    }

    // ── GET PROJECTS ──────────────────────────────────────────────
    public async Task<IReadOnlyList<ProfileProjectDto>> GetProjectsAsync(
        Guid profileId,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        page     = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 50 ? 12 : pageSize;

        var profile = await _db.Profiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == profileId, ct);
        if (profile is null) return Array.Empty<ProfileProjectDto>();

        var pinned = ParsePinned(profile.PinnedProjectIdsJson).ToHashSet();

        var projects = await _db.Projects.AsNoTracking()
            .Where(p => p.ClientProfileId == profileId || p.ExecutorProfileId == profileId)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProfileProjectDto(
                p.Id,
                p.Title,
                p.Description,
                p.Budget,
                p.Status.ToString(),
                p.CreatedAt,
                p.ClientProfileId == profileId,
                p.ExecutorProfileId == profileId,
                false))
            .ToListAsync(ct);

        // Проставим IsPinned в памяти без повторного запроса.
        return projects
            .Select(p => p with { IsPinned = pinned.Contains(p.Id) })
            .ToList();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEPTION
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Бизнес-исключение сервиса профилей.
/// StatusCode определяет HTTP-ответ в контроллере (400 / 403 / 404).
/// </summary>
public sealed class ProfileException : Exception
{
    public int StatusCode { get; }

    public ProfileException(string message, int statusCode = 400)
        : base(message)
    {
        StatusCode = statusCode;
    }
}
