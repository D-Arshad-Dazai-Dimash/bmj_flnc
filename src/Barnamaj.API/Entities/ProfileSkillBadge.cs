namespace Barnamaj.API.Entities;

/// <summary>
/// Бейдж верификации навыка на профиле.
/// Создаётся автоматически при прохождении теста с результатом ≥ 80%.
///
/// Составной PK: (ProfileId, SkillId) — один бейдж на пару профиль+навык.
/// При новых успешных попытках обновляется только BestScore (если выше).
/// </summary>
public class ProfileSkillBadge
{
    // ── Составной PK ─────────────────────────────────────────
    public Guid ProfileId { get; set; }
    public Guid SkillId   { get; set; }

    // ── Навигация ────────────────────────────────────────────
    public Profile Profile { get; set; } = null!;
    public Skill   Skill   { get; set; } = null!;

    // ── Данные бейджа ────────────────────────────────────────
    /// <summary>Лучший результат по данному навыку (0–100)</summary>
    public decimal BestScore  { get; set; }

    /// <summary>Когда бейдж был получен впервые</summary>
    public DateTime AchievedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Когда BestScore был последний раз обновлён</summary>
    public DateTime UpdatedAt  { get; set; } = DateTime.UtcNow;
}
