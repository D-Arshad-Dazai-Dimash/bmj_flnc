using Barnamaj.API.Entities;

namespace Barnamaj.API.DTOs.Auth;

/// <summary>
/// Данные для регистрации нового пользователя.
/// AccountType — Individual или Company (Clan создаётся отдельно).
/// Поля ТОО/ИП (LegalForm..ContactPhone) заполняются только для Company.
/// </summary>
public sealed record RegisterDto(
    string Email,
    string Password,
    string Name,
    AccountType AccountType,
    string? Bio,
    // ── ТОО / ИП юридические поля ──────────────────────────
    string? LegalForm,         // "ТОО" | "ИП" | etc.
    string? Bin,               // БИН (12 символов)
    string? IinEntrepreneur,   // ИИН для ИП
    string? LegalName,         // Официальное название компании
    string? LegalAddress,      // Юридический адрес
    string? DirectorName,      // ФИО директора
    string? ContactPhone       // Контактный телефон компании
);

/// <summary>
/// Данные для входа в систему.
/// </summary>
public sealed record LoginDto(
    string Email,
    string Password
);

/// <summary>
/// Запрос на обновление публичного профиля текущего пользователя.
/// </summary>
public sealed record UpdateProfileDto(
    string? Name,
    string? Bio
);

/// <summary>
/// Ответ на успешную аутентификацию.
/// AccessToken и RefreshToken устанавливаются как httpOnly cookies — не возвращаются клиенту напрямую.
/// </summary>
public sealed record AuthResponseDto(
    string AccessToken,
    DateTime ExpiresAt,
    string RefreshToken,
    DateTime RefreshExpiresAt,
    UserDto User
);

/// <summary>
/// Публичное представление пользователя в API-ответах.
/// Никогда не включает PasswordHash.
/// </summary>
public sealed record UserDto(
    Guid Id,
    string Email,
    string Role,
    Guid? ProfileId,
    string ProfileName,
    string AccountType,
    bool IsEmailVerified,
    DateTime CreatedAt,
    List<string>? Specialties = null
);
