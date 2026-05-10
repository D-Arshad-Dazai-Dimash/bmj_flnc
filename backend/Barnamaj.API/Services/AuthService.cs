using System.IdentityModel.Tokens.Jwt;
using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Auth;
using Barnamaj.API.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default);
    Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken ct = default);
    Task<AuthResponseDto> RefreshAsync(string refreshToken, CancellationToken ct = default);
    Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto, CancellationToken ct = default);
    /// <summary>Отозвать refresh-токен на сервере (если валидный). Никогда не бросает исключений — logout всегда должен успевать.</summary>
    Task LogoutAsync(string? refreshToken, CancellationToken ct = default);
}

/// <summary>
/// Сервис авторизации Barnamaj.
///
/// Register: создаёт User + Profile в одной транзакции.
/// Login:    проверяет пароль (BCrypt), выдаёт JWT.
/// Refresh:  sliding rotation с reuse-detection через IRefreshTokenStore.
/// </summary>
public sealed class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtService  _jwt;
    private readonly IRefreshTokenStore _refreshStore;
    private readonly IHttpContextAccessor _http;
    private readonly ILogger<AuthService> _logger;

    // Заранее вычисленный фиктивный хэш для timing-safe проверки несуществующих пользователей.
    // BCrypt.Verify() занимает столько же времени, что и реальная проверка (workFactor=12).
    private static readonly string _dummyHash =
        BCrypt.Net.BCrypt.HashPassword("dummy-timing-protection-value", workFactor: 12);

    public AuthService(
        AppDbContext db,
        IJwtService jwt,
        IRefreshTokenStore refreshStore,
        IHttpContextAccessor http,
        ILogger<AuthService> logger)
    {
        _db           = db;
        _jwt          = jwt;
        _refreshStore = refreshStore;
        _http         = http;
        _logger       = logger;
    }

    // ── REGISTER ──────────────────────────────────────────────
    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default)
    {
        // 1. Проверка уникальности email (без учёта регистра)
        var emailLower = dto.Email.ToLowerInvariant();
        var exists = await _db.Users
            .AsNoTracking()
            .AnyAsync(u => u.Email == emailLower, ct);

        if (exists)
            throw new AuthException("Пользователь с таким email уже зарегистрирован.");

        // 2. Хешируем пароль — BCrypt с work factor 12
        //    Никогда не храним plaintext!
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12);

        // 3. Создаём Profile и User в одной транзакции
        //    NpgsqlRetryingExecutionStrategy требует обёртки через CreateExecutionStrategy
        User?    createdUser    = null;
        Profile? createdProfile = null;

        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                var profile = new Profile
                {
                    Name        = dto.Name.Trim(),
                    Bio         = dto.Bio?.Trim(),
                    AccountType = dto.AccountType,
                    IsVerified  = false,
                    // Юридические реквизиты (только для Company/ИП)
                    LegalForm       = dto.LegalForm?.Trim(),
                    Bin             = dto.Bin?.Trim(),
                    IinEntrepreneur = dto.IinEntrepreneur?.Trim(),
                    LegalName       = dto.LegalName?.Trim(),
                    LegalAddress    = dto.LegalAddress?.Trim(),
                    DirectorName    = dto.DirectorName?.Trim(),
                    ContactPhone    = dto.ContactPhone?.Trim(),
                };
                _db.Profiles.Add(profile);

                var user = new User
                {
                    Email        = emailLower,
                    PasswordHash = passwordHash,
                    Role         = UserRole.Member,
                    ProfileId    = profile.Id,
                    Profile      = profile,
                };
                _db.Users.Add(user);

                // Для Company/Clan создаём Membership с ролью Owner,
                // чтобы зарегистрированный пользователь сразу мог
                // управлять профилем (создавать проекты, приглашать и т.д.).
                // Individual-профили не используют Membership-связи.
                if (dto.AccountType != AccountType.Individual)
                {
                    _db.Memberships.Add(new Membership
                    {
                        User            = user,
                        Profile         = profile,
                        RoleInGroup     = MembershipRole.Owner,
                        Status          = MembershipStatus.Active,
                        JoinedAt        = DateTime.UtcNow,
                        InvitedByUserId = null,
                    });
                }

                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                createdUser    = user;
                createdProfile = profile;
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        });

        _logger.LogInformation(
            "auth_event=register user_id={UserId} email={Email} account_type={AccountType} ip={Ip}",
            createdUser!.Id, createdUser.Email, dto.AccountType, GetIp());

        return await BuildResponseAsync(createdUser!, createdProfile!, refreshFamilyId: null, ct);
    }

    // ── LOGIN ─────────────────────────────────────────────────
    public async Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken ct = default)
    {
        var emailLower = dto.Email.ToLowerInvariant();

        // Загружаем пользователя вместе с профилем одним запросом
        var user = await _db.Users
            .Include(u => u.Profile)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == emailLower, ct);

        // Намеренно одинаковое сообщение — не раскрываем, что именно неверно
        const string invalidMsg = "Неверный email или пароль.";

        if (user is null)
        {
            // Timing-safe: Verify() против фиктивного хэша занимает то же время,
            // что и проверка реального пароля — скрываем факт существования email.
            BCrypt.Net.BCrypt.Verify(dto.Password, _dummyHash);
            throw new AuthException(invalidMsg);
        }

        if (!user.IsActive)
            throw new AuthException("Аккаунт заблокирован. Обратитесь в поддержку.");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            _logger.LogWarning("Failed login attempt for {Email}", emailLower);
            throw new AuthException(invalidMsg);
        }

        // Обновляем LastLoginAt (через прямой UPDATE без tracking)
        await _db.Users
            .Where(u => u.Id == user.Id)
            .ExecuteUpdateAsync(s =>
                s.SetProperty(u => u.LastLoginAt, DateTime.UtcNow), ct);

        _logger.LogInformation(
            "auth_event=login user_id={UserId} email={Email} ip={Ip} ua={UserAgent}",
            user.Id, user.Email, GetIp(), GetUa());

        var profile = user.Profile
            ?? throw new InvalidOperationException($"User {user.Id} has no linked profile.");

        return await BuildResponseAsync(user, profile, refreshFamilyId: null, ct);
    }

    // ── UPDATE PROFILE ────────────────────────────────────────
    public async Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto, CancellationToken ct = default)
    {
        var user = await _db.Users
            .Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AuthException("Пользователь не найден.");

        var profile = user.Profile
            ?? throw new InvalidOperationException($"User {userId} has no linked profile.");

        if (!string.IsNullOrWhiteSpace(dto.Name))
            profile.Name = dto.Name.Trim();

        if (dto.Bio is not null)
            profile.Bio = dto.Bio.Trim();

        await _db.SaveChangesAsync(ct);

        return new UserDto(
            Id:              user.Id,
            Email:           user.Email,
            Role:            user.Role.ToString(),
            ProfileId:       profile.Id,
            ProfileName:     profile.Name,
            AccountType:     profile.AccountType.ToString(),
            IsEmailVerified: user.IsEmailVerified,
            CreatedAt:       user.CreatedAt);
    }

    // ── REFRESH TOKEN ──────────────────────────────────────────
    public async Task<AuthResponseDto> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var principal = _jwt.ValidateRefreshToken(refreshToken)
            ?? throw new AuthException("Токен недействителен или истёк.");

        // "sub" — стандартный claim. На всякий случай fallback на NameIdentifier
        // (если когда-то токен выдавался при включённом mapping).
        var sub = principal.FindFirst("sub")?.Value
                  ?? principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(sub) || !Guid.TryParse(sub, out var userId))
            throw new AuthException("Токен повреждён.");

        var jtiStr = principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        if (!Guid.TryParse(jtiStr, out var jti))
            throw new AuthException("Токен повреждён (jti).");

        // Серверная валидация: revoked? reuse? expired?
        var (validation, familyId) = await _refreshStore.ValidateAsync(jti, refreshToken, ct);
        switch (validation)
        {
            case RefreshValidationResult.Valid:
                break;
            case RefreshValidationResult.ReuseDetected:
                _logger.LogWarning("Refresh reuse detected for user {UserId}; family {FamilyId} revoked.", userId, familyId);
                throw new AuthException("Сессия отозвана. Войдите заново.");
            default:
                throw new AuthException("Токен недействителен или истёк.");
        }

        var user = await _db.Users
            .Include(u => u.Profile)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AuthException("Пользователь не найден.");

        if (!user.IsActive)
        {
            await _refreshStore.RevokeFamilyAsync(familyId, "user_disabled", ct);
            throw new AuthException("Аккаунт заблокирован.");
        }

        var profile = user.Profile
            ?? throw new InvalidOperationException($"User {userId} has no linked profile.");

        // Sliding rotation: выдаём новый refresh в той же family, старый помечаем rotated.
        var response = await BuildResponseAsync(user, profile, refreshFamilyId: familyId, ct);
        await _refreshStore.MarkRotatedAsync(jti, GetJtiFromAuthResponse(response), ct);

        _logger.LogInformation(
            "auth_event=refresh user_id={UserId} family_id={FamilyId} old_jti={OldJti}",
            user.Id, familyId, jti);

        return response;
    }

    // ── LOGOUT (серверный revoke) ─────────────────────────────
    public async Task LogoutAsync(string? refreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) return;

        try
        {
            var principal = _jwt.ValidateRefreshToken(refreshToken);
            var jtiStr = principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
            if (Guid.TryParse(jtiStr, out var jti))
            {
                await _refreshStore.RevokeAsync(jti, "logout", ct);
                var sub = principal?.FindFirst("sub")?.Value;
                _logger.LogInformation(
                    "auth_event=logout user_id={UserId} jti={Jti} ip={Ip}",
                    sub ?? "unknown", jti, GetIp());
            }
        }
        catch (Exception ex)
        {
            // Logout должен всегда успевать — логируем, но не бросаем.
            _logger.LogWarning(ex, "Failed to revoke refresh token on logout");
        }
    }

    // ── Helpers ───────────────────────────────────────────────
    private async Task<AuthResponseDto> BuildResponseAsync(User user, Profile profile, Guid? refreshFamilyId, CancellationToken ct)
    {
        var pair = _jwt.GenerateTokens(user, profile, refreshFamilyId);

        // Сохраняем refresh в store для revocation/rotation/reuse-detection.
        var ctx = _http.HttpContext;
        var ip = ctx?.Connection.RemoteIpAddress?.ToString();
        var ua = ctx?.Request.Headers.UserAgent.ToString();
        await _refreshStore.IssueAsync(
            jti:       pair.RefreshJti,
            userId:    user.Id,
            familyId:  pair.RefreshFamilyId,
            token:     pair.RefreshToken,
            expiresAt: pair.RefreshExpiresAt,
            ipAddress: ip,
            userAgent: string.IsNullOrEmpty(ua) ? null : ua,
            ct:        ct);

        return new AuthResponseDto(
            AccessToken:      pair.AccessToken,
            ExpiresAt:        pair.AccessExpiresAt,
            RefreshToken:     pair.RefreshToken,
            RefreshExpiresAt: pair.RefreshExpiresAt,
            User: new UserDto(
                Id:              user.Id,
                Email:           user.Email,
                Role:            user.Role.ToString(),
                ProfileId:       profile.Id,
                ProfileName:     profile.Name,
                AccountType:     profile.AccountType.ToString(),
                IsEmailVerified: user.IsEmailVerified,
                CreatedAt:       user.CreatedAt));
    }

    private static Guid GetJtiFromAuthResponse(AuthResponseDto response)
    {
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(response.RefreshToken);
        var jtiStr = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti)?.Value;
        return Guid.TryParse(jtiStr, out var jti) ? jti : Guid.Empty;
    }

    private string GetIp()  => _http.HttpContext?.Connection.RemoteIpAddress?.ToString() ?? "-";
    private string GetUa()  => _http.HttpContext?.Request.Headers.UserAgent.ToString() ?? "-";
}

/// <summary>
/// Ошибка аутентификации — преобразуется в HTTP 400/401 в контроллере.
/// </summary>
public sealed class AuthException : Exception
{
    public AuthException(string message) : base(message) { }
}
