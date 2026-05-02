using Barnamaj.API.Entities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Barnamaj.API.Services;

public interface IJwtService
{
    /// <summary>Сгенерировать access + refresh токены для пользователя.</summary>
    (string AccessToken, DateTime AccessExpiresAt, string RefreshToken, DateTime RefreshExpiresAt)
        GenerateTokens(User user, Profile profile);

    /// <summary>Прочитать ClaimsPrincipal из refresh-токена (без проверки expiry).</summary>
    ClaimsPrincipal? ValidateRefreshToken(string token);
}

/// <summary>
/// Сервис генерации JWT-токенов.
/// Access token: 15 минут. Refresh token: 30 дней.
/// Оба хранятся в httpOnly cookies — клиент их не видит.
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

    public (string AccessToken, DateTime AccessExpiresAt, string RefreshToken, DateTime RefreshExpiresAt)
        GenerateTokens(User user, Profile profile)
    {
        var accessExpiresAt  = DateTime.UtcNow.AddMinutes(_settings.AccessTokenExpiresInMinutes);
        var refreshExpiresAt = DateTime.UtcNow.AddDays(_settings.RefreshTokenExpiresInDays);

        var accessToken  = BuildToken(user, profile, accessExpiresAt,  "access");
        var refreshToken = BuildToken(user, profile, refreshExpiresAt, "refresh");

        return (accessToken, accessExpiresAt, refreshToken, refreshExpiresAt);
    }

    public ClaimsPrincipal? ValidateRefreshToken(string token)
    {
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,  // проверяет expiry refresh-токена
            ValidateIssuerSigningKey = true,
            ValidIssuer              = _settings.Issuer,
            ValidAudience            = _settings.Audience,
            IssuerSigningKey         = _signingKey,
            ClockSkew                = TimeSpan.Zero
        };

        try
        {
            var principal = new JwtSecurityTokenHandler()
                .ValidateToken(token, parameters, out var securityToken);

            // Убедиться что это именно refresh-токен
            var tokenType = principal.FindFirstValue("token_type");
            return tokenType == "refresh" ? principal : null;
        }
        catch
        {
            return null;
        }
    }

    private string BuildToken(User user, Profile profile, DateTime expiresAt, string tokenType)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat,
                new DateTimeOffset(DateTime.UtcNow).ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),

            // Кастомные claims Barnamaj
            new Claim("role",         user.Role.ToString()),
            new Claim("profile_id",   profile.Id.ToString()),
            new Claim("profile_name", profile.Name),
            new Claim("account_type", profile.AccountType.ToString()),
            new Claim("token_type",   tokenType),
        };

        var credentials = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:             _settings.Issuer,
            audience:           _settings.Audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            expiresAt,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

/// <summary>
/// Конфигурация JWT из appsettings.json → секция "Jwt".
/// </summary>
public sealed class JwtSettings
{
    public string SecretKey                   { get; init; } = string.Empty;
    public string Issuer                      { get; init; } = string.Empty;
    public string Audience                    { get; init; } = string.Empty;
    public int    AccessTokenExpiresInMinutes  { get; init; } = 15;
    public int    RefreshTokenExpiresInDays    { get; init; } = 30;
}
