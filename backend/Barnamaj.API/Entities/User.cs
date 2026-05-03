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

    // ── KYC (рынок РК) ───────────────────────────────────────
    /// <summary>Текущий уровень подтверждения личности.</summary>
    public KycStatus KycStatus { get; set; } = KycStatus.None;

    /// <summary>Когда достигнут уровень Full (после одобрения документа).</summary>
    public DateTime? KycVerifiedAt { get; set; }

    /// <summary>Казахстанский номер в формате +7XXXXXXXXXX. Хранится в открытом виде
    /// (сам по себе не относится к чувствительным ПДн без привязки к ИИН).</summary>
    public string? Phone { get; set; }

    public bool IsPhoneVerified { get; set; } = false;

    /// <summary>HMAC-SHA256(ИИН) с секретом IinHmacKey — для уникального индекса
    /// без хранения plaintext ИИН в БД. Длина: 64 hex-символа.</summary>
    public string? IinHmac { get; set; }

    /// <summary>AES-GCM зашифрованный ИИН с тегом и nonce (Base64).
    /// Расшифровывается только в коде через IIinProtector для отображения
    /// модератору/самому пользователю. В лог никогда не пишется.</summary>
    public string? IinEncrypted { get; set; }

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

    // ── KYC связи ────────────────────────────────────────────
    public ICollection<UserDocument> Documents { get; set; } = new List<UserDocument>();
    public ICollection<KycEvent>     KycEvents { get; set; } = new List<KycEvent>();
}
