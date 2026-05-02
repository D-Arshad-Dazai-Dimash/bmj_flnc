namespace Barnamaj.API.Entities;

/// <summary>
/// Навык / специализация (C#, Python, UI/UX и т.д.).
/// Является корневым агрегатом для вопросов и бейджей.
/// </summary>
public class Skill
{
    // ── Идентификатор ────────────────────────────────────────
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── Основная информация ──────────────────────────────────
    /// <summary>Краткое название: "C#", "Python", "UI/UX Design"</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Подробное описание навыка и что проверяет тест</summary>
    public string? Description { get; set; }

    /// <summary>Категория: "Backend", "Frontend", "Design", "Architecture"</summary>
    public string? Category { get; set; }

    // ── Флаги ────────────────────────────────────────────────
    /// <summary>Скрытые навыки не отображаются в публичном листинге</summary>
    public bool IsActive { get; set; } = true;

    // ── Временные метки ──────────────────────────────────────
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // ── Навигационные свойства ───────────────────────────────
    public ICollection<Question>          Questions { get; set; } = new List<Question>();
    public ICollection<AssessmentAttempt> Attempts  { get; set; } = new List<AssessmentAttempt>();
    public ICollection<ProfileSkillBadge> Badges    { get; set; } = new List<ProfileSkillBadge>();
}
