using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Auth;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default);
    Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken ct = default);
    Task<AuthResponseDto> RefreshAsync(string refreshToken, CancellationToken ct = default);
    Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto, CancellationToken ct = default);
}

/// <summary>
/// Сервис авторизации Barnamaj.
///
/// Register: создаёт User + Profile в одной транзакции.
/// Login:    проверяет пароль (BCrypt), выдаёт JWT.
/// </summary>
public sealed class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtService  _jwt;
    private readonly ILogger<AuthService> _logger;

    // Заранее вычисленный фиктивный хэш для timing-safe проверки несуществующих пользователей.
    // BCrypt.Verify() занимает столько же времени, что и реальная проверка (workFactor=12).
    private static readonly string _dummyHash =
        BCrypt.Net.BCrypt.HashPassword("dummy-timing-protection-value", workFactor: 12);

    public AuthService(AppDbContext db, IJwtService jwt, ILogger<AuthService> logger)
    {
        _db     = db;
        _jwt    = jwt;
        _logger = logger;
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
            "New user registered: {UserId} | {Email} | {AccountType}",
            createdUser!.Id, createdUser.Email, dto.AccountType);

        return BuildResponse(createdUser!, createdProfile!);
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

        _logger.LogInformation("User logged in: {UserId} | {Email}", user.Id, user.Email);

        var profile = user.Profile
            ?? throw new InvalidOperationException($"User {user.Id} has no linked profile.");

        return BuildResponse(user, profile);
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

        var user = await _db.Users
            .Include(u => u.Profile)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AuthException("Пользователь не найден.");

        if (!user.IsActive)
            throw new AuthException("Аккаунт заблокирован.");

        var profile = user.Profile
            ?? throw new InvalidOperationException($"User {userId} has no linked profile.");

        return BuildResponse(user, profile);
    }

    // ── Helpers ───────────────────────────────────────────────
    private AuthResponseDto BuildResponse(User user, Profile profile)
    {
        var (accessToken, accessExpiresAt, refreshToken, refreshExpiresAt) =
            _jwt.GenerateTokens(user, profile);

        return new AuthResponseDto(
            AccessToken:      accessToken,
            ExpiresAt:        accessExpiresAt,
            RefreshToken:     refreshToken,
            RefreshExpiresAt: refreshExpiresAt,
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
}

/// <summary>
/// Ошибка аутентификации — преобразуется в HTTP 400/401 в контроллере.
/// </summary>
public sealed class AuthException : Exception
{
    public AuthException(string message) : base(message) { }
}
