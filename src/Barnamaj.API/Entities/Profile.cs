namespace Barnamaj.API.Entities;

/// <summary>
/// Публичный профиль на платформе Barnamaj.
///
/// Один профиль соответствует одному субъекту:
///   • Individual — профиль фрилансера
///   • Company    — профиль компании
///   • Clan       — группа фрилансеров
///
/// User (аккаунт) привязан к своему Individual-профилю (1:1).
/// Компании и кланы имеют собственные профили и связаны с
/// пользователями через таблицу Membership.
/// </summary>
public class Profile
{
    // ── Идентификатор ────────────────────────────────────────
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── Публичная информация ─────────────────────────────────
    /// <summary>Публичное имя: псевдоним фрилансера, название компании/клана</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Краткое описание / биография</summary>
    public string? Bio { get; set; }

    /// <summary>URL логотипа (хранится в объектном хранилище)</summary>
    public string? LogoUrl { get; set; }

    // ── Тип профиля ──────────────────────────────────────────
    /// <summary>Individual | Company | Clan</summary>
    public AccountType AccountType { get; set; } = AccountType.Individual;

    // ── Верификация ──────────────────────────────────────────
    /// <summary>Профиль подтверждён командой Barnamaj (галочка)</summary>
    public bool IsVerified { get; set; } = false;

    // ── Временные метки (UTC) ────────────────────────────────
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    // ── Навигационные свойства ───────────────────────────────

    /// <summary>Участники этого клана/компании</summary>
    public ICollection<Membership>         Memberships  { get; set; } = new List<Membership>();

    /// <summary>Верифицированные навыки (бейджи), полученные через тестирование</summary>
    public ICollection<ProfileSkillBadge>  SkillBadges  { get; set; } = new List<ProfileSkillBadge>();
}
