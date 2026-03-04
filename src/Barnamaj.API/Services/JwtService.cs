using Barnamaj.API.Entities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Barnamaj.API.Services;

public interface IJwtService
{
    /// <summary>Сгенерировать JWT-токен для пользователя.</summary>
    (string Token, DateTime ExpiresAt) GenerateToken(User user, Profile profile);
}

/// <summary>
/// Сервис генерации JWT-токенов.
/// Настройки берутся из секции Jwt в appsettings.json.
/// </summary>
public sealed class JwtService : IJwtService
{
    private readonly JwtSettings _settings;
    private readonly SymmetricSecurityKey _signingKey;

    public JwtService(IConfiguration configuration)
    {
        _settings = configuration.GetSection("Jwt").Get<JwtSettings>()
            ?? throw new InvalidOperationException("JWT settings are not configured in appsettings.json.");

        if (string.IsNullOrWhiteSpace(_settings.SecretKey) || _settings.SecretKey.Length < 32)
            throw new InvalidOperationException("Jwt:SecretKey must be at least 32 characters long.");

        _signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
    }

    public (string Token, DateTime ExpiresAt) GenerateToken(User user, Profile profile)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_settings.ExpiresInMinutes);

        // Claims — данные, зашитые в токен (читаются без обращения к БД)
        var claims = new[]
        {
            // Стандартные claims
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()), // уникальный ID токена
            new Claim(JwtRegisteredClaimNames.Iat,
                new DateTimeOffset(DateTime.UtcNow).ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),

            // Кастомные claims Barnamaj
            new Claim("role",         user.Role.ToString()),
            new Claim("profile_id",   profile.Id.ToString()),
            new Claim("profile_name", profile.Name),
            new Claim("account_type", profile.AccountType.ToString()),
        };

        var credentials = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:             _settings.Issuer,
            audience:           _settings.Audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}

/// <summary>
/// Типизированная конфигурация JWT-раздела из appsettings.json.
/// </summary>
public sealed class JwtSettings
{
    public string SecretKey       { get; init; } = string.Empty;
    public string Issuer          { get; init; } = string.Empty;
    public string Audience        { get; init; } = string.Empty;
    public int    ExpiresInMinutes { get; init; } = 60;
}
