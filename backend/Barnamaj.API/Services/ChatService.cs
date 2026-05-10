using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Chat;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

public interface IChatService
{
    /// <summary>Получает существующий или создаёт новый тред между двумя профилями.</summary>
    Task<ChatThread> EnsureThreadAsync(
        Guid profileAId,
        Guid profileBId,
        Guid? projectId,
        CancellationToken ct = default);

    /// <summary>Открыть тред от лица текущего пользователя.</summary>
    Task<ChatThreadDto> StartThreadAsync(
        StartThreadDto dto,
        Guid currentUserId,
        CancellationToken ct = default);

    /// <summary>Список тредов текущего пользователя (для всех его профилей).</summary>
    Task<IReadOnlyList<ChatThreadDto>> ListThreadsAsync(
        Guid currentUserId,
        CancellationToken ct = default);

    /// <summary>Сообщения в треде; пользователь должен быть участником.</summary>
    Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(
        Guid threadId,
        Guid currentUserId,
        DateTime? afterUtc,
        CancellationToken ct = default);

    /// <summary>Отправить сообщение в тред.</summary>
    Task<ChatMessageDto> SendMessageAsync(
        Guid threadId,
        SendMessageDto dto,
        Guid currentUserId,
        CancellationToken ct = default);

    /// <summary>
    /// Системное сообщение (вызывается из других сервисов, без проверок прав).
    /// </summary>
    Task<ChatMessage> SendSystemMessageAsync(
        Guid threadId,
        Guid senderProfileId,
        string body,
        Guid? projectId,
        CancellationToken ct = default);

    /// <summary>Помечает тред прочитанным для текущего пользователя.</summary>
    Task MarkReadAsync(
        Guid threadId,
        Guid currentUserId,
        CancellationToken ct = default);

    /// <summary>Общее количество непрочитанных тредов.</summary>
    Task<int> GetUnreadCountAsync(
        Guid currentUserId,
        CancellationToken ct = default);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

public sealed class ChatService : IChatService
{
    private readonly AppDbContext         _db;
    private readonly ILogger<ChatService> _logger;

    public ChatService(AppDbContext db, ILogger<ChatService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── Helpers ──────────────────────────────────────────────────

    /// <summary>Нормализует пару profile-id (меньший — первый).</summary>
    private static (Guid a, Guid b) Normalize(Guid x, Guid y)
        => x.CompareTo(y) <= 0 ? (x, y) : (y, x);

    /// <summary>Все profile-id, принадлежащие user-у (через Users + Memberships).</summary>
    private async Task<HashSet<Guid>> GetUserProfileIdsAsync(Guid userId, CancellationToken ct)
    {
        var own = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId && u.ProfileId != null)
            .Select(u => u.ProfileId!.Value)
            .ToListAsync(ct);

        var groups = await _db.Memberships
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.Status == MembershipStatus.Active)
            .Select(m => m.ProfileId)
            .ToListAsync(ct);

        return own.Concat(groups).ToHashSet();
    }

    // ── EnsureThread ─────────────────────────────────────────────

    public async Task<ChatThread> EnsureThreadAsync(
        Guid profileAId, Guid profileBId, Guid? projectId, CancellationToken ct = default)
    {
        if (profileAId == profileBId)
            throw new ChatException("Нельзя создать диалог с самим собой.");

        var (p1, p2) = Normalize(profileAId, profileBId);

        var existing = await _db.ChatThreads
            .FirstOrDefaultAsync(t => t.Profile1Id == p1 && t.Profile2Id == p2, ct);

        if (existing is not null)
        {
            // Если был без проекта — допишем; иначе оставим как есть.
            if (existing.ProjectId is null && projectId.HasValue)
            {
                existing.ProjectId = projectId;
                await _db.SaveChangesAsync(ct);
            }
            return existing;
        }

        var thread = new ChatThread
        {
            Profile1Id = p1,
            Profile2Id = p2,
            ProjectId  = projectId,
        };
        _db.ChatThreads.Add(thread);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg
            && pg.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            // Гонка: тред создал параллельный запрос
            thread = await _db.ChatThreads
                .FirstAsync(t => t.Profile1Id == p1 && t.Profile2Id == p2, ct);
        }

        return thread;
    }

    public async Task<ChatThreadDto> StartThreadAsync(
        StartThreadDto dto, Guid currentUserId, CancellationToken ct = default)
    {
        var myProfileIds = await GetUserProfileIdsAsync(currentUserId, ct);
        if (myProfileIds.Count == 0)
            throw new ChatException("У пользователя нет активного профиля.", 403);

        // Берём первый собственный профиль (Individual).
        var myProfileId = myProfileIds.First();

        var thread = await EnsureThreadAsync(myProfileId, dto.OtherProfileId, dto.ProjectId, ct);
        return await BuildThreadDtoAsync(thread.Id, myProfileIds, ct)
            ?? throw new ChatException("Не удалось загрузить созданный тред.", 500);
    }

    // ── ListThreads ──────────────────────────────────────────────

    public async Task<IReadOnlyList<ChatThreadDto>> ListThreadsAsync(
        Guid currentUserId, CancellationToken ct = default)
    {
        var myProfileIds = await GetUserProfileIdsAsync(currentUserId, ct);
        if (myProfileIds.Count == 0) return Array.Empty<ChatThreadDto>();

        var threads = await _db.ChatThreads
            .AsNoTracking()
            .Where(t => myProfileIds.Contains(t.Profile1Id) || myProfileIds.Contains(t.Profile2Id))
            .OrderByDescending(t => t.UpdatedAt)
            .Take(200)
            .ToListAsync(ct);

        if (threads.Count == 0) return Array.Empty<ChatThreadDto>();

        var threadIds = threads.Select(t => t.Id).ToList();

        // Последнее сообщение по треду
        var lastByThread = await _db.ChatMessages
            .AsNoTracking()
            .Where(m => threadIds.Contains(m.ThreadId))
            .GroupBy(m => m.ThreadId)
            .Select(g => g.OrderByDescending(m => m.CreatedAt).First())
            .ToDictionaryAsync(m => m.ThreadId, ct);

        var profileIds = threads.SelectMany(t => new[] { t.Profile1Id, t.Profile2Id }).ToHashSet();
        var profiles   = await _db.Profiles
            .AsNoTracking()
            .Where(p => profileIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, p.LogoUrl })
            .ToDictionaryAsync(p => p.Id, ct);

        var projIds  = threads.Where(t => t.ProjectId.HasValue).Select(t => t.ProjectId!.Value).ToList();
        var projects = await _db.Projects
            .AsNoTracking()
            .Where(p => projIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Title })
            .ToDictionaryAsync(p => p.Id, ct);

        var result = new List<ChatThreadDto>(threads.Count);
        foreach (var t in threads)
        {
            var iAmP1   = myProfileIds.Contains(t.Profile1Id);
            var otherId = iAmP1 ? t.Profile2Id : t.Profile1Id;
            var other   = profiles.GetValueOrDefault(otherId);

            lastByThread.TryGetValue(t.Id, out var lastMsg);

            var myReadAt = iAmP1 ? t.Profile1ReadAt : t.Profile2ReadAt;
            var hasUnread = lastMsg is not null
                && lastMsg.SenderProfileId != (iAmP1 ? t.Profile1Id : t.Profile2Id)
                && (myReadAt is null || lastMsg.CreatedAt > myReadAt.Value);

            string? projectTitle = null;
            if (t.ProjectId.HasValue && projects.TryGetValue(t.ProjectId.Value, out var pr))
                projectTitle = pr.Title;

            result.Add(new ChatThreadDto(
                Id:                  t.Id,
                OtherProfileId:      otherId,
                OtherProfileName:    other?.Name ?? "—",
                OtherProfileLogoUrl: other?.LogoUrl,
                ProjectId:           t.ProjectId,
                ProjectTitle:        projectTitle,
                LastMessageBody:     lastMsg?.Body,
                UpdatedAt:           t.UpdatedAt,
                HasUnread:           hasUnread
            ));
        }

        return result;
    }

    private async Task<ChatThreadDto?> BuildThreadDtoAsync(
        Guid threadId, HashSet<Guid> myProfileIds, CancellationToken ct)
    {
        var t = await _db.ChatThreads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == threadId, ct);
        if (t is null) return null;

        var iAmP1 = myProfileIds.Contains(t.Profile1Id);
        var otherId = iAmP1 ? t.Profile2Id : t.Profile1Id;
        var other = await _db.Profiles.AsNoTracking()
            .Where(p => p.Id == otherId)
            .Select(p => new { p.Name, p.LogoUrl })
            .FirstOrDefaultAsync(ct);

        string? projectTitle = null;
        if (t.ProjectId.HasValue)
        {
            projectTitle = await _db.Projects.AsNoTracking()
                .Where(p => p.Id == t.ProjectId)
                .Select(p => p.Title)
                .FirstOrDefaultAsync(ct);
        }

        return new ChatThreadDto(
            Id: t.Id,
            OtherProfileId: otherId,
            OtherProfileName: other?.Name ?? "—",
            OtherProfileLogoUrl: other?.LogoUrl,
            ProjectId: t.ProjectId,
            ProjectTitle: projectTitle,
            LastMessageBody: null,
            UpdatedAt: t.UpdatedAt,
            HasUnread: false
        );
    }

    // ── GetMessages / SendMessage ───────────────────────────────

    private async Task<ChatThread> GetThreadForUserAsync(
        Guid threadId, Guid userId, CancellationToken ct, bool track = false)
    {
        var myProfileIds = await GetUserProfileIdsAsync(userId, ct);
        var q = track ? _db.ChatThreads.AsQueryable() : _db.ChatThreads.AsNoTracking();
        var thread = await q.FirstOrDefaultAsync(t => t.Id == threadId, ct);
        if (thread is null) throw new ChatException("Диалог не найден.", 404);
        if (!myProfileIds.Contains(thread.Profile1Id) && !myProfileIds.Contains(thread.Profile2Id))
            throw new ChatException("Нет доступа к этому диалогу.", 403);
        return thread;
    }

    public async Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(
        Guid threadId, Guid currentUserId, DateTime? afterUtc, CancellationToken ct = default)
    {
        _ = await GetThreadForUserAsync(threadId, currentUserId, ct);

        var q = _db.ChatMessages.AsNoTracking().Where(m => m.ThreadId == threadId);
        if (afterUtc.HasValue) q = q.Where(m => m.CreatedAt > afterUtc.Value);

        var msgs = await q.OrderBy(m => m.CreatedAt).Take(500).ToListAsync(ct);
        if (msgs.Count == 0) return Array.Empty<ChatMessageDto>();

        var senderIds = msgs.Select(m => m.SenderProfileId).ToHashSet();
        var names = await _db.Profiles.AsNoTracking()
            .Where(p => senderIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name })
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return msgs.Select(m => new ChatMessageDto(
            Id:               m.Id,
            ThreadId:         m.ThreadId,
            SenderProfileId:  m.SenderProfileId,
            SenderProfileName:names.GetValueOrDefault(m.SenderProfileId) ?? "—",
            Body:             m.Body,
            IsSystem:         m.IsSystem,
            ProjectId:        m.ProjectId,
            CreatedAt:        m.CreatedAt
        )).ToList();
    }

    public async Task<ChatMessageDto> SendMessageAsync(
        Guid threadId, SendMessageDto dto, Guid currentUserId, CancellationToken ct = default)
    {
        var body = (dto.Body ?? string.Empty).Trim();
        if (body.Length == 0) throw new ChatException("Пустое сообщение.");
        if (body.Length > 5000) throw new ChatException("Сообщение слишком длинное (макс. 5000).");

        var thread = await GetThreadForUserAsync(threadId, currentUserId, ct, track: true);
        var myProfileIds = await GetUserProfileIdsAsync(currentUserId, ct);
        var senderProfileId = myProfileIds.Contains(thread.Profile1Id) ? thread.Profile1Id : thread.Profile2Id;

        var now = DateTime.UtcNow;
        var msg = new ChatMessage
        {
            ThreadId        = threadId,
            SenderProfileId = senderProfileId,
            Body            = body,
            IsSystem        = false,
            ProjectId       = dto.ProjectId,
            CreatedAt       = now,
        };
        _db.ChatMessages.Add(msg);

        thread.UpdatedAt = now;
        // Автоматически отмечаем тред как прочитанный для отправителя.
        if (senderProfileId == thread.Profile1Id) thread.Profile1ReadAt = now;
        else thread.Profile2ReadAt = now;

        await _db.SaveChangesAsync(ct);

        var senderName = await _db.Profiles.AsNoTracking()
            .Where(p => p.Id == senderProfileId).Select(p => p.Name).FirstOrDefaultAsync(ct) ?? "—";

        return new ChatMessageDto(
            Id: msg.Id, ThreadId: threadId, SenderProfileId: senderProfileId,
            SenderProfileName: senderName, Body: body, IsSystem: false,
            ProjectId: msg.ProjectId, CreatedAt: now);
    }

    public async Task<ChatMessage> SendSystemMessageAsync(
        Guid threadId, Guid senderProfileId, string body, Guid? projectId, CancellationToken ct = default)
    {
        var thread = await _db.ChatThreads.FirstOrDefaultAsync(t => t.Id == threadId, ct)
            ?? throw new ChatException("Диалог не найден.", 404);

        var now = DateTime.UtcNow;
        var msg = new ChatMessage
        {
            ThreadId        = threadId,
            SenderProfileId = senderProfileId,
            Body            = body,
            IsSystem        = true,
            ProjectId       = projectId,
            CreatedAt       = now,
        };
        _db.ChatMessages.Add(msg);
        thread.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);
        return msg;
    }

    // ── Read / Unread ───────────────────────────────────────────

    public async Task MarkReadAsync(Guid threadId, Guid currentUserId, CancellationToken ct = default)
    {
        var thread = await GetThreadForUserAsync(threadId, currentUserId, ct, track: true);
        var myProfileIds = await GetUserProfileIdsAsync(currentUserId, ct);
        var now = DateTime.UtcNow;
        if (myProfileIds.Contains(thread.Profile1Id)) thread.Profile1ReadAt = now;
        if (myProfileIds.Contains(thread.Profile2Id)) thread.Profile2ReadAt = now;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<int> GetUnreadCountAsync(Guid currentUserId, CancellationToken ct = default)
    {
        var myProfileIds = await GetUserProfileIdsAsync(currentUserId, ct);
        if (myProfileIds.Count == 0) return 0;

        var threads = await _db.ChatThreads.AsNoTracking()
            .Where(t => myProfileIds.Contains(t.Profile1Id) || myProfileIds.Contains(t.Profile2Id))
            .Select(t => new { t.Id, t.Profile1Id, t.Profile2Id, t.Profile1ReadAt, t.Profile2ReadAt })
            .ToListAsync(ct);

        if (threads.Count == 0) return 0;

        var threadIds = threads.Select(t => t.Id).ToList();
        var lasts = await _db.ChatMessages.AsNoTracking()
            .Where(m => threadIds.Contains(m.ThreadId))
            .GroupBy(m => m.ThreadId)
            .Select(g => g.OrderByDescending(m => m.CreatedAt).First())
            .ToDictionaryAsync(m => m.ThreadId, ct);

        int count = 0;
        foreach (var t in threads)
        {
            if (!lasts.TryGetValue(t.Id, out var last)) continue;
            var iAmP1 = myProfileIds.Contains(t.Profile1Id);
            var myProfileId = iAmP1 ? t.Profile1Id : t.Profile2Id;
            var myReadAt = iAmP1 ? t.Profile1ReadAt : t.Profile2ReadAt;
            if (last.SenderProfileId == myProfileId) continue;
            if (myReadAt is null || last.CreatedAt > myReadAt.Value) count++;
        }
        return count;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEPTION
// ═══════════════════════════════════════════════════════════════════════════

public sealed class ChatException : Exception
{
    public int StatusCode { get; }
    public ChatException(string message, int statusCode = 400) : base(message)
    {
        StatusCode = statusCode;
    }
}
