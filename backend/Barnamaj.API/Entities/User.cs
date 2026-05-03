namespace Barnamaj.API.Entities;

/// <summary>
/// Аккаунт пользователя платформы Barnamaj.
///
/// Отвечает ТОЛЬКО за аутентификацию и авторизацию.
/// Вся публичная информация хранится в связанном Profile.
///
/// Архитектура:
///   User ──(1:1)──► Profile (Individual) — собственный профиль
///   User ──(M:M)──► Profile (Clan/Company) — через таблицу Membership
/// </summary>
public class User
{
    // ── Идентификатор ────────────────────────────────────────
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── Аутентификация ───────────────────────────────────────
    /// <summary>Email — уникальный логин</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Хэш пароля (BCrypt). Никогда не хранить plaintext!</summary>
    public string PasswordHash { get; set; } = string.Empty;

    // ── Роль в системе ───────────────────────────────────────
    /// <summary>Member | Moderator | Admin</summary>
    public UserRole Role { get; set; } = UserRole.Member;

    // ── Статус ───────────────────────────────────────────────
    public bool IsActive { get; set; } = true;
    public bool IsEmailVerified { get; set; } = false;

    // ── Телефон (auth-фактор и канал OTP) ────────────────────
    /// <summary>Телефон в международном формате, например +77011234567. NULL пока не задан.</summary>
    public string? Phone { get; set; }
    public bool    IsPhoneVerified { get; set; } = false;

    // ── KYC (подтверждение личности) ─────────────────────────
    /// <summary>Индивидуальный идентификационный номер (12 цифр). NULL пока не задан.</summary>
    public string? Iin { get; set; }

    /// <summary>None | Lite | Full | Rejected</summary>
    public KycStatus KycStatus { get; set; } = KycStatus.None;

    /// <summary>Идентификатор у KYC-провайдера (например, applicantId Sumsub).</summary>
    public string?  KycProviderRef { get; set; }
    public DateTime? KycVerifiedAt { get; set; }

    // ── Временные метки (UTC) ────────────────────────────────
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public DateTime? DeletedAt { get; set; }   // Soft-delete

    // ── Связь с профилем ─────────────────────────────────────
    /// <summary>FK на собственный Individual-профиль пользователя</summary>
    public Guid? ProfileId { get; set; }

    /// <summary>Навигационное свойство: собственный профиль</summary>
    public Profile? Profile { get; set; }

    // ── Участие в кланах/компаниях ───────────────────────────
    /// <summary>Все членства пользователя в кланах и компаниях</summary>
    public ICollection<Membership> Memberships { get; set; } = new List<Membership>();
}
