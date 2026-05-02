namespace Barnamaj.API.Entities;

/// <summary>
/// Попытка прохождения теста по конкретному навыку.
///
/// Содержит снимок ответов пользователя (AnswersJson) и итоговый балл.
/// Используется для аналитики и истории попыток.
/// </summary>
public class AssessmentAttempt
{
    // ── Идентификатор ────────────────────────────────────────
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── Связи ────────────────────────────────────────────────
    /// <summary>Профиль, от имени которого сдаётся тест</summary>
    public Guid    ProfileId { get; set; }
    public Profile Profile   { get; set; } = null!;

    /// <summary>Тестируемый навык</summary>
    public Guid  SkillId { get; set; }
    public Skill Skill   { get; set; } = null!;

    // ── Ответы ───────────────────────────────────────────────
    /// <summary>
    /// JSON-снимок ответов пользователя.
    /// Формат: [{"questionId":"...","selectedIndex":2}, ...]
    /// </summary>
    public string AnswersJson { get; set; } = "[]";

    // ── Результат ────────────────────────────────────────────
    public int  CorrectCount { get; set; }
    public int  TotalCount   { get; set; }

    /// <summary>Процент правильных ответов (0–100.00)</summary>
    public decimal ScorePercent { get; set; }

    public AttemptStatus Status { get; set; }

    // ── Временные метки ──────────────────────────────────────
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}
