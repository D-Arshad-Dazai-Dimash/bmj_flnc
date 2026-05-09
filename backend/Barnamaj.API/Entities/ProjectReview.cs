namespace Barnamaj.API.Entities;

/// <summary>Сторона, оставившая отзыв.</summary>
public enum ReviewDirection : byte
{
    ClientToExecutor = 1,  // заказчик оценивает исполнителя
    ExecutorToClient = 2,  // исполнитель оценивает заказчика
}

/// <summary>
/// Двусторонний отзыв между заказчиком и исполнителем после Completed-проекта.
///
/// Инварианты (в БД через индекс):
///   • Один отзыв на (ProjectId, Direction).
///   • Author и Target определяются ролью в проекте (ClientProfile / ExecutorProfile).
///
/// Скрытие модератором (IsHidden=true) исключает отзыв из публичного списка
/// и из агрегата AvgRating, но сама запись сохраняется для аудита.
/// </summary>
public class ProjectReview
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── FK ────────────────────────────────────────────────────
    public Guid    ProjectId { get; set; }
    public Project Project   { get; set; } = null!;

    /// <summary>Кто написал (User, не Profile — для аудита под кем именно).</summary>
    public Guid AuthorUserId { get; set; }
    public User AuthorUser   { get; set; } = null!;

    /// <summary>Профиль автора (для отображения "от ТОО Барнамаж" и т.п.).</summary>
    public Guid    AuthorProfileId { get; set; }
    public Profile AuthorProfile   { get; set; } = null!;

    /// <summary>Профиль, которому адресован отзыв.</summary>
    public Guid    TargetProfileId { get; set; }
    public Profile TargetProfile   { get; set; } = null!;

    public ReviewDirection Direction { get; set; }

    // ── Содержание ───────────────────────────────────────────
    /// <summary>Оценка 1..5 (валидируется в сервисе).</summary>
    public byte Stars { get; set; }

    /// <summary>Текст отзыва (опц., до 2000 символов).</summary>
    public string? Comment { get; set; }

    /// <summary>Теги (см. RatingService.AvailableTags) — JSON массив строк.</summary>
    public string? TagsJson { get; set; }

    // ── Модерация ────────────────────────────────────────────
    public bool    IsHidden        { get; set; } = false;
    public Guid?   HiddenByUserId  { get; set; }
    public string? HiddenReason    { get; set; }
    public DateTime? HiddenAt      { get; set; }

    // ── Метки ────────────────────────────────────────────────
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
