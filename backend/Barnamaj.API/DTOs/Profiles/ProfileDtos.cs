using Barnamaj.API.Entities;

namespace Barnamaj.API.DTOs.Profiles;

// ═══════════════════════════════════════════════════════════════════════════
// INPUT DTOs
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Запрос на создание нового профиля организации (Clan или Company).
/// Individual-профили создаются автоматически при регистрации.
/// </summary>
public sealed record CreateProfileDto(
    string      Name,
    string?     Bio,
    string?     LogoUrl,
    AccountType AccountType   // только Clan (3) или Company (2)
);

/// <summary>
/// Запрос на отправку приглашения пользователю по email.
/// </summary>
public sealed record InviteUserDto(
    string Email
);

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT DTOs
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Краткая информация о профиле (используется в списках).
/// </summary>
public sealed record ProfileSummaryDto(
    Guid        Id,
    string      Name,
    string?     Bio,
    string?     LogoUrl,
    string      AccountType,
    bool        IsVerified,
    int         MemberCount,
    DateTime    CreatedAt
);

/// <summary>
/// Профиль с ролью текущего пользователя (для GET /my-teams).
/// </summary>
public sealed record MyTeamDto(
    Guid        ProfileId,
    string      Name,
    string?     Bio,
    string?     LogoUrl,
    string      AccountType,
    bool        IsVerified,
    string      MyRole,           // Member / Admin / Owner
    string      Status,           // Active / Pending
    DateTime?   JoinedAt,
    int         MemberCount
);

/// <summary>
/// Ответ при приглашении — краткая информация о созданной записи Membership.
/// </summary>
public sealed record InviteResponseDto(
    Guid        MembershipId,
    string      InvitedUserEmail,
    string      ProfileName,
    string      Status        // всегда "Pending"
);
