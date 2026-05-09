namespace Barnamaj.API.DTOs.Reviews;

// ── Запрос ───────────────────────────────────────────────────────

/// <summary>
/// Создание отзыва после Completed-проекта. Автор = текущий пользователь;
/// направление и target вычисляются сервисом из роли в проекте.
/// </summary>
public sealed record CreateReviewDto(
    /// <summary>Оценка 1..5.</summary>
    byte                   Stars,
    /// <summary>Опц. комментарий, до 2000 символов.</summary>
    string?                Comment,
    /// <summary>Опц. теги (см. <c>RatingService.AvailableTags</c>).</summary>
    IReadOnlyList<string>? Tags
);

/// <summary>Жалоба/скрытие отзыва модератором.</summary>
public sealed record HideReviewDto(string Reason);

// ── Ответ ────────────────────────────────────────────────────────

public sealed record ReviewDto(
    Guid     Id,
    Guid     ProjectId,
    string   ProjectTitle,
    string   Direction,            // ClientToExecutor | ExecutorToClient
    Guid     AuthorProfileId,
    string   AuthorName,
    string?  AuthorLogoUrl,
    Guid     TargetProfileId,
    byte     Stars,
    string?  Comment,
    IReadOnlyList<string> Tags,
    bool     IsHidden,
    DateTime CreatedAt
);

public sealed record RatingSummaryDto(
    decimal? AvgRating,            // null = ещё нет отзывов
    int      RatingsCount,
    /// <summary>Распределение оценок 1..5: { "1": int, ..., "5": int }.</summary>
    IReadOnlyDictionary<string,int> Breakdown
);

public sealed record ReviewsPageDto(
    int                 Total,
    int                 Page,
    int                 PageSize,
    IReadOnlyList<ReviewDto> Items
);
