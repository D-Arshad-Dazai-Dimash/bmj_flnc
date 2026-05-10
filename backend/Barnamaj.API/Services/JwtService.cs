using Barnamaj.API.Entities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Barnamaj.API.Services;

/// <summary>
/// Результат генерации пары токенов с метаданными для серверного хранения refresh.
/// </summary>
public sealed record TokenPair(
    string AccessToken,    DateTime AccessExpiresAt,
    string RefreshToken,   DateTime RefreshExpiresAt,
    Guid   RefreshJti,     Guid     RefreshFamilyId);

public interface IJwtService
{
    /// <summary>
    /// Сгенерировать access + refresh токены для пользователя.
    /// Если <paramref name="refreshFamilyId"/> передан — refresh принадлежит к существующей цепочке rotation,
    /// иначе создаётся новая family.
    /// </summary>
    TokenPair GenerateTokens(User user, Profile profile, Guid? refreshFamilyId = null);

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

    public TokenPair GenerateTokens(User user, Profile profile, Guid? refreshFamilyId = null)
    {
        var accessExpiresAt  = DateTime.UtcNow.AddMinutes(_settings.AccessTokenExpiresInMinutes);
        var refreshExpiresAt = DateTime.UtcNow.AddDays(_settings.RefreshTokenExpiresInDays);

        var accessJti  = Guid.NewGuid();
        var refreshJti = Guid.NewGuid();
        var familyId   = refreshFamilyId ?? Guid.NewGuid();

        var accessToken  = BuildToken(user, profile, accessExpiresAt,  "access",  accessJti,  null);
        var refreshToken = BuildToken(user, profile, refreshExpiresAt, "refresh", refreshJti, familyId);

        return new TokenPair(
            AccessToken:      accessToken,
            AccessExpiresAt:  accessExpiresAt,
            RefreshToken:     refreshToken,
            RefreshExpiresAt: refreshExpiresAt,
            RefreshJti:       refreshJti,
            RefreshFamilyId:  familyId);
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
            // MapInboundClaims=false — чтобы "sub" остался "sub", а не превратился в NameIdentifier.
            // (Глобальный JwtBearer уже так настроен, но локальный handler — отдельный экземпляр.)
            var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
            var principal = handler.ValidateToken(token, parameters, out var securityToken);

            // Убедиться что это именно refresh-токен
            var tokenType = principal.FindFirstValue("token_type");
            return tokenType == "refresh" ? principal : null;
        }
        catch
        {
            return null;
        }
    }

    private string BuildToken(User user, Profile profile, DateTime expiresAt, string tokenType, Guid jti, Guid? familyId)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti,   jti.ToString()),
            new(JwtRegisteredClaimNames.Iat,
                new DateTimeOffset(DateTime.UtcNow).ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),

            // Кастомные claims Barnamaj
            new("role",         user.Role.ToString()),
            new("profile_id",   profile.Id.ToString()),
            new("profile_name", profile.Name),
            new("account_type", profile.AccountType.ToString()),
            new("token_type",   tokenType),
        };

        if (familyId is not null)
            claims.Add(new Claim("fid", familyId.Value.ToString()));

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
