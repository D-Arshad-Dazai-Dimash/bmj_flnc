namespace Barnamaj.API.Entities;

/// <summary>
/// Проект (техническое задание) на платформе Barnamaj.
///
/// Связи:
///   ClientProfile  — профиль заказчика (Company / Clan / Individual)
///   ExecutorProfile — профиль исполнителя (null пока не назначен)
///
/// Жизненный цикл: Open → InProgress → Review → Completed / Cancelled
/// </summary>
public class Project
{
    // ── Идентификатор ────────────────────────────────────────
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── Основная информация ──────────────────────────────────
    /// <summary>Краткое название проекта</summary>
    public string  Title       { get; set; } = string.Empty;

    /// <summary>Подробное описание / техническое задание</summary>
    public string? Description { get; set; }

    /// <summary>Бюджет в условных единицах (≥ 0). Null — договорная цена</summary>
    public decimal? Budget { get; set; }

    /// <summary>Крайний срок сдачи (UTC). Должен быть в будущем при создании</summary>
    public DateTime? Deadline { get; set; }

    // ── Статус ───────────────────────────────────────────────
    public ProjectStatus Status { get; set; } = ProjectStatus.Open;

    // ── Заказчик ─────────────────────────────────────────────
    /// <summary>FK на Profile — кто разместил заказ</summary>
    public Guid ClientProfileId { get; set; }
    public Profile ClientProfile { get; set; } = null!;

    // ── Исполнитель ──────────────────────────────────────────
    /// <summary>FK на Profile — кто выполняет (null пока не назначен)</summary>
    public Guid? ExecutorProfileId { get; set; }
    public Profile? ExecutorProfile { get; set; }

    // ── Временные метки (UTC) ────────────────────────────────
    public DateTime  CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime  UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    // ── Заявки ───────────────────────────────────────────────
    /// <summary>Заявки от претендентов на выполнение проекта</summary>
    public ICollection<ProjectApplication> Applications { get; set; } = new List<ProjectApplication>();
}
