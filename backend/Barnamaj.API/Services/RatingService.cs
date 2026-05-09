using System.Text.Json;
using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Reviews;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

public sealed class RatingException : Exception
{
    public string Code { get; }
    public int    StatusCode { get; }
    public RatingException(string code, string message, int status = 400) : base(message)
    { Code = code; StatusCode = status; }
}

public interface IRatingService
{
    Task<ReviewDto>        CreateAsync(Guid projectId, Guid currentUserId, CreateReviewDto dto, CancellationToken ct);
    Task<ReviewsPageDto>   GetForProfileAsync(Guid profileId, int page, int pageSize, CancellationToken ct);
    Task<RatingSummaryDto> GetSummaryAsync(Guid profileId, CancellationToken ct);
    Task<IReadOnlyList<ReviewDto>> GetForProjectAsync(Guid projectId, Guid currentUserId, CancellationToken ct);
    Task<ReviewsPageDto>   ListRecentAsync(int page, int pageSize, bool? hidden, CancellationToken ct);
    Task                   HideAsync(Guid reviewId, Guid moderatorUserId, string reason, CancellationToken ct);
    Task                   RestoreAsync(Guid reviewId, Guid moderatorUserId, CancellationToken ct);

    /// <summary>Заранее одобренные теги (UI отображает чекбоксами).</summary>
    static readonly IReadOnlyList<string> AvailableTags = new[]
    {
        // executor → client (заказчик глазами исполнителя)
        "Чёткое ТЗ", "Своевременная оплата", "Адекватное общение", "Доверяет специалисту",
        // client → executor (исполнитель глазами заказчика)
        "Качество", "Сроки", "Коммуникация", "Профессионализм", "Инициативность",
    };
}

/// <summary>
/// Двусторонний рейтинг проектов:
///   • ClientToExecutor / ExecutorToClient — по одному на проект и направление.
///   • Только для Project.Status == Completed.
///   • После создания пересчитывается AvgRating цели (окно 50 свежих не-скрытых).
///   • Спорные случаи решает модератор через Hide / Restore.
/// </summary>
public sealed class RatingService : IRatingService
{
    private const int RatingWindow = 50;
    private const int CommentMax   = 2000;

    private readonly AppDbContext _db;
    private readonly ILogger<RatingService> _log;

    public RatingService(AppDbContext db, ILogger<RatingService> log)
    {
        _db = db; _log = log;
    }

    public async Task<ReviewDto> CreateAsync(Guid projectId, Guid currentUserId, CreateReviewDto dto, CancellationToken ct)
    {
        if (dto.Stars is < 1 or > 5)
            throw new RatingException("invalid_stars", "Оценка должна быть от 1 до 5.");
        if (dto.Comment is not null && dto.Comment.Length > CommentMax)
            throw new RatingException("comment_too_long", $"Комментарий — до {CommentMax} символов.");

        var tags = NormalizeTags(dto.Tags);

        var project = await _db.Projects
            .Include(p => p.ClientProfile)
            .Include(p => p.ExecutorProfile)
            .FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new RatingException("project_not_found", "Проект не найден.", 404);

        if (project.Status != ProjectStatus.Completed)
            throw new RatingException("project_not_completed", "Отзыв можно оставить только для завершённого проекта.", 409);
        if (project.ExecutorProfileId is null)
            throw new RatingException("no_executor", "У проекта нет исполнителя.", 409);

        // Определяем сторону текущего юзера в проекте.
        var (direction, authorProfileId, targetProfileId) =
            await ResolveSidesAsync(project, currentUserId, ct);

        // Один отзыв на (проект, направление).
        var exists = await _db.ProjectReviews
            .AnyAsync(r => r.ProjectId == projectId && r.Direction == direction, ct);
        if (exists)
            throw new RatingException("review_exists", "Вы уже оставили отзыв по этому проекту.", 409);

        var review = new ProjectReview
        {
            ProjectId       = projectId,
            AuthorUserId    = currentUserId,
            AuthorProfileId = authorProfileId,
            TargetProfileId = targetProfileId,
            Direction       = direction,
            Stars           = dto.Stars,
            Comment         = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
            TagsJson        = tags.Count == 0 ? null : JsonSerializer.Serialize(tags),
        };
        _db.ProjectReviews.Add(review);
        await _db.SaveChangesAsync(ct);

        await RecalculateRatingAsync(targetProfileId, ct);

        _log.LogInformation("Review {ReviewId} created: project={ProjectId} dir={Direction} stars={Stars}",
            review.Id, projectId, direction, dto.Stars);

        return await BuildDtoAsync(review.Id, ct)
            ?? throw new RatingException("internal", "Не удалось загрузить отзыв.", 500);
    }

    public async Task<ReviewsPageDto> GetForProfileAsync(Guid profileId, int page, int pageSize, CancellationToken ct)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var q = _db.ProjectReviews
            .AsNoTracking()
            .Where(r => r.TargetProfileId == profileId && !r.IsHidden);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_db.Profiles.AsNoTracking(), r => r.AuthorProfileId, p => p.Id,
                  (r, p) => new { r, AuthorName = p.Name, AuthorLogo = p.LogoUrl })
            .Join(_db.Projects.AsNoTracking(), x => x.r.ProjectId, p => p.Id,
                  (x, p) => new { x.r, x.AuthorName, x.AuthorLogo, ProjectTitle = p.Title })
            .ToListAsync(ct);

        var dtos = items.Select(x => MapToDto(x.r, x.AuthorName, x.AuthorLogo, x.ProjectTitle)).ToList();

        return new ReviewsPageDto(total, page, pageSize, dtos);
    }

    public async Task<RatingSummaryDto> GetSummaryAsync(Guid profileId, CancellationToken ct)
    {
        var profile = await _db.Profiles
            .AsNoTracking()
            .Where(p => p.Id == profileId)
            .Select(p => new { p.AvgRating, p.RatingsCount })
            .FirstOrDefaultAsync(ct)
            ?? throw new RatingException("profile_not_found", "Профиль не найден.", 404);

        var grouped = await _db.ProjectReviews
            .AsNoTracking()
            .Where(r => r.TargetProfileId == profileId && !r.IsHidden)
            .OrderByDescending(r => r.CreatedAt)
            .Take(RatingWindow)
            .GroupBy(r => r.Stars)
            .Select(g => new { Stars = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var breakdown = new Dictionary<string, int>
        {
            ["1"] = 0, ["2"] = 0, ["3"] = 0, ["4"] = 0, ["5"] = 0,
        };
        foreach (var g in grouped) breakdown[g.Stars.ToString()] = g.Count;

        return new RatingSummaryDto(profile.AvgRating, profile.RatingsCount, breakdown);
    }

    public async Task<IReadOnlyList<ReviewDto>> GetForProjectAsync(Guid projectId, Guid currentUserId, CancellationToken ct)
    {
        var project = await _db.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new RatingException("project_not_found", "Проект не найден.", 404);

        // Определяем, видит ли пользователь скрытые отзывы — нет, видит только админ.
        // Скрытые отзывы участникам тоже не показываем (auditing-only).
        var raw = await _db.ProjectReviews
            .AsNoTracking()
            .Where(r => r.ProjectId == projectId && !r.IsHidden)
            .OrderByDescending(r => r.CreatedAt)
            .Join(_db.Profiles.AsNoTracking(), r => r.AuthorProfileId, p => p.Id,
                  (r, p) => new { r, AuthorName = p.Name, AuthorLogo = p.LogoUrl, ProjectTitle = project.Title })
            .ToListAsync(ct);

        return raw.Select(x => MapToDto(x.r, x.AuthorName, x.AuthorLogo, x.ProjectTitle)).ToList();
    }

    public async Task<ReviewsPageDto> ListRecentAsync(int page, int pageSize, bool? hidden, CancellationToken ct)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.ProjectReviews.AsNoTracking().AsQueryable();
        if (hidden.HasValue) q = q.Where(r => r.IsHidden == hidden.Value);

        var total = await q.CountAsync(ct);
        var rows = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_db.Profiles.AsNoTracking(), r => r.AuthorProfileId, p => p.Id,
                  (r, p) => new { r, AuthorName = p.Name, AuthorLogo = p.LogoUrl })
            .Join(_db.Projects.AsNoTracking(), x => x.r.ProjectId, p => p.Id,
                  (x, p) => new { x.r, x.AuthorName, x.AuthorLogo, ProjectTitle = p.Title })
            .ToListAsync(ct);

        var items = rows.Select(x => MapToDto(x.r, x.AuthorName, x.AuthorLogo, x.ProjectTitle)).ToList();
        return new ReviewsPageDto(total, page, pageSize, items);
    }

    public async Task HideAsync(Guid reviewId, Guid moderatorUserId, string reason, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Length is < 5 or > 500)
            throw new RatingException("invalid_reason", "Причина — от 5 до 500 символов.");

        var r = await _db.ProjectReviews.FirstOrDefaultAsync(x => x.Id == reviewId, ct)
            ?? throw new RatingException("not_found", "Отзыв не найден.", 404);

        if (r.IsHidden) return;

        r.IsHidden       = true;
        r.HiddenByUserId = moderatorUserId;
        r.HiddenReason   = reason.Trim();
        r.HiddenAt       = DateTime.UtcNow;
        r.UpdatedAt      = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await RecalculateRatingAsync(r.TargetProfileId, ct);
    }

    public async Task RestoreAsync(Guid reviewId, Guid moderatorUserId, CancellationToken ct)
    {
        var r = await _db.ProjectReviews.FirstOrDefaultAsync(x => x.Id == reviewId, ct)
            ?? throw new RatingException("not_found", "Отзыв не найден.", 404);

        if (!r.IsHidden) return;

        r.IsHidden       = false;
        r.HiddenByUserId = null;
        r.HiddenReason   = null;
        r.HiddenAt       = null;
        r.UpdatedAt      = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await RecalculateRatingAsync(r.TargetProfileId, ct);

        _ = moderatorUserId; // зарезервировано под аудит-лог
    }

    // ── helpers ───────────────────────────────────────────────

    private async Task RecalculateRatingAsync(Guid profileId, CancellationToken ct)
    {
        var window = await _db.ProjectReviews
            .AsNoTracking()
            .Where(r => r.TargetProfileId == profileId && !r.IsHidden)
            .OrderByDescending(r => r.CreatedAt)
            .Take(RatingWindow)
            .Select(r => (int)r.Stars)
            .ToListAsync(ct);

        var profile = await _db.Profiles.FirstOrDefaultAsync(p => p.Id == profileId, ct);
        if (profile is null) return;

        if (window.Count == 0)
        {
            profile.AvgRating    = null;
            profile.RatingsCount = 0;
        }
        else
        {
            profile.AvgRating    = Math.Round((decimal)window.Average(), 2);
            profile.RatingsCount = window.Count;
        }
        await _db.SaveChangesAsync(ct);
    }

    private async Task<(ReviewDirection dir, Guid authorProfileId, Guid targetProfileId)>
        ResolveSidesAsync(Project project, Guid userId, CancellationToken ct)
    {
        // Кто этот пользователь относительно проекта — клиент или исполнитель?
        // Решаем через Membership: активный участник profile-а одной из сторон.
        var clientProfileId   = project.ClientProfileId;
        var executorProfileId = project.ExecutorProfileId!.Value;

        var isClient = await IsActiveOnProfileAsync(userId, clientProfileId, project.ClientProfile.AccountType, ct);
        var isExec   = await IsActiveOnProfileAsync(userId, executorProfileId, project.ExecutorProfile!.AccountType, ct);

        if (isClient && !isExec)
            return (ReviewDirection.ClientToExecutor, clientProfileId, executorProfileId);
        if (isExec && !isClient)
            return (ReviewDirection.ExecutorToClient, executorProfileId, clientProfileId);
        if (isClient && isExec)
            throw new RatingException("self_review", "Вы участник обеих сторон — отзыв невозможен.", 409);

        throw new RatingException("not_a_party", "Вы не участник этого проекта.", 403);
    }

    private async Task<bool> IsActiveOnProfileAsync(Guid userId, Guid profileId, AccountType type, CancellationToken ct)
    {
        if (type == AccountType.Individual)
        {
            return await _db.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == userId && u.ProfileId == profileId, ct);
        }
        return await _db.Memberships
            .AsNoTracking()
            .AnyAsync(m => m.UserId == userId && m.ProfileId == profileId &&
                           m.Status == MembershipStatus.Active, ct);
    }

    private static IReadOnlyList<string> NormalizeTags(IReadOnlyList<string>? raw)
    {
        if (raw is null || raw.Count == 0) return Array.Empty<string>();
        var allowed = new HashSet<string>(IRatingService.AvailableTags, StringComparer.Ordinal);
        return raw
            .Where(t => !string.IsNullOrWhiteSpace(t) && allowed.Contains(t))
            .Distinct()
            .Take(8)
            .ToList();
    }

    private async Task<ReviewDto?> BuildDtoAsync(Guid reviewId, CancellationToken ct)
    {
        var x = await _db.ProjectReviews
            .AsNoTracking()
            .Where(r => r.Id == reviewId)
            .Join(_db.Profiles.AsNoTracking(), r => r.AuthorProfileId, p => p.Id,
                  (r, p) => new { r, AuthorName = p.Name, AuthorLogo = p.LogoUrl })
            .Join(_db.Projects.AsNoTracking(), x => x.r.ProjectId, p => p.Id,
                  (x, p) => new { x.r, x.AuthorName, x.AuthorLogo, ProjectTitle = p.Title })
            .FirstOrDefaultAsync(ct);
        return x is null ? null : MapToDto(x.r, x.AuthorName, x.AuthorLogo, x.ProjectTitle);
    }

    private static ReviewDto MapToDto(ProjectReview r, string authorName, string? authorLogo, string projectTitle)
    {
        IReadOnlyList<string> tags = string.IsNullOrEmpty(r.TagsJson)
            ? Array.Empty<string>()
            : JsonSerializer.Deserialize<List<string>>(r.TagsJson) ?? new();

        return new ReviewDto(
            Id:              r.Id,
            ProjectId:       r.ProjectId,
            ProjectTitle:    projectTitle,
            Direction:       r.Direction.ToString(),
            AuthorProfileId: r.AuthorProfileId,
            AuthorName:      authorName,
            AuthorLogoUrl:   authorLogo,
            TargetProfileId: r.TargetProfileId,
            Stars:           r.Stars,
            Comment:         r.Comment,
            Tags:            tags,
            IsHidden:        r.IsHidden,
            CreatedAt:       r.CreatedAt);
    }
}
