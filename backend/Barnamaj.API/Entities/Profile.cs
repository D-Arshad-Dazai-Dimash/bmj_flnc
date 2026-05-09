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

    // ── Социальный вид профиля ────────────────────────────────────
    /// <summary>Пресет обложки (0..9). Рисуется на фронте как CSS-gradient —
    /// без хранилища файлов.</summary>
    public int CoverPresetId { get; set; } = 0;

    /// <summary>Короткий статус («Открыт к предложениям» и т.п.). До 80 символов.</summary>
    public string? Status { get; set; }

    /// <summary>JSON-массив Guid закреплённых проектов (max 6).
    /// Порядок в массиве = порядок отображения.</summary>
    public string? PinnedProjectIdsJson { get; set; }

    // ── Тип профиля ──────────────────────────────────────────
    /// <summary>Individual | Company | Clan</summary>
    public AccountType AccountType { get; set; } = AccountType.Individual;

    // ── Верификация ──────────────────────────────────────────
    /// <summary>Профиль подтверждён командой Barnamaj (галочка)</summary>
    public bool IsVerified { get; set; } = false;

    // ── Рейтинг (денормализация: пересчитывается RatingService) ──
    /// <summary>Средняя оценка по последним 50 не-скрытым отзывам. Null = ещё нет.</summary>
    public decimal? AvgRating    { get; set; }
    /// <summary>Кол-во не-скрытых отзывов в окне (≤ 50).</summary>
    public int      RatingsCount { get; set; }

    // ── Временные метки (UTC) ────────────────────────────────
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    // ── Юридические реквизиты (ТОО/ИП, только Company) ──────
    public string? LegalForm       { get; set; }   // ТОО | ИП
    public string? Bin             { get; set; }   // БИН 12 символов
    public string? IinEntrepreneur { get; set; }   // ИИН для ИП
    public string? LegalName       { get; set; }   // Официальное название
    public string? LegalAddress    { get; set; }   // Юридический адрес
    public string? DirectorName    { get; set; }   // ФИО директора
    public string? ContactPhone    { get; set; }   // Телефон компании

    // ── Навигационные свойства ───────────────────────────────

    /// <summary>Участники этого клана/компании</summary>
    public ICollection<Membership>         Memberships  { get; set; } = new List<Membership>();

    /// <summary>Верифицированные навыки (бейджи), полученные через тестирование</summary>
    public ICollection<ProfileSkillBadge>  SkillBadges  { get; set; } = new List<ProfileSkillBadge>();
}
