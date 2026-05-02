namespace Barnamaj.API.Entities;

/// <summary>
/// Связующая таблица: Пользователь ↔ Клан/Компания.
///
/// Реализует отношение Многие-ко-Многим:
///   • Один пользователь может состоять в нескольких кланах/компаниях
///   • Один клан/компания может содержать множество пользователей
///
/// Расширенная join-table с дополнительными полями:
///   RoleInGroup — роль внутри конкретной группы (Owner/Admin/Member)
///   JoinedAt    — дата вступления
///   IsActive    — был ли исключён
/// </summary>
public class Membership
{
    // ── Идентификатор ────────────────────────────────────────
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── FK: Пользователь ─────────────────────────────────────
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // ── FK: Профиль клана или компании ───────────────────────
    /// <summary>
    /// Ссылка на Profile с AccountType = Clan или Company.
    /// Individual-профили в качестве группы не используются.
    /// </summary>
    public Guid ProfileId { get; set; }
    public Profile Profile { get; set; } = null!;

    // ── Роль внутри группы ───────────────────────────────────
    /// <summary>Роль этого пользователя в данном клане/компании</summary>
    public MembershipRole RoleInGroup { get; set; } = MembershipRole.Member;

    // ── Статус членства ──────────────────────────────────
    /// <summary>Pending → Active / Rejected / Left / Kicked</summary>
    public MembershipStatus Status { get; set; } = MembershipStatus.Pending;

    // ── Временные метки (UTC) ────────────────────────────
    /// <summary>Когда было создано приглашение или запись членства</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Когда статус стал Active (null — ещё не принято)</summary>
    public DateTime? JoinedAt { get; set; }

    // ── Кто пригласил ────────────────────────────────────
    /// <summary>UserId того, кто отправил приглашение (null — основатель)</summary>
    public Guid? InvitedByUserId { get; set; }
}
