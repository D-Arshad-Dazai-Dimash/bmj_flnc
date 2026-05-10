namespace Barnamaj.API.Entities;

/// <summary>
/// Серверная запись о выпущенном refresh-токене.
/// Используется для:
///   - sliding rotation (каждый refresh выдаёт новый, старый помечается Revoked + ReplacedByJti);
///   - reuse-detection (если приходит уже использованный/revoked токен — revoke всю family);
///   - server-side logout (revoke по jti).
///
/// Сам токен не хранится — только sha256-хэш.
/// </summary>
public class RefreshToken
{
    /// <summary>JWT id из claim "jti". PK.</summary>
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>
    /// Идентификатор «семьи» — общий для всей цепочки rotation.
    /// Reuse-detection отзывает все токены с одинаковым FamilyId.
    /// </summary>
    public Guid FamilyId { get; set; }

    /// <summary>SHA-256 от строки токена. Сырой токен НЕ хранится.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }

    /// <summary>null = активный; иначе — отозван.</summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>Причина отзыва: rotated | logout | reuse_detected | family_revoked | user_disabled.</summary>
    public string? RevokedReason { get; set; }

    /// <summary>Если RevokedReason = rotated → jti нового токена в цепочке.</summary>
    public Guid? ReplacedByJti { get; set; }

    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    /// <summary>Активен = не отозван и не истёк.</summary>
    public bool IsActive(DateTime nowUtc) => RevokedAt is null && ExpiresAt > nowUtc;
}
