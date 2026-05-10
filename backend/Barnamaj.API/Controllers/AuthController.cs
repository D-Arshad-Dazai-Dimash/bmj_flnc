using Barnamaj.API.DTOs.Auth;
using Barnamaj.API.Entities;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Аутентификация и регистрация пользователей Barnamaj.
/// Токены хранятся в httpOnly cookies (защита от XSS).
/// </summary>
[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    // Имена cookie — едины для контроллера и middleware
    internal const string AccessTokenCookie  = "access_token";
    internal const string RefreshTokenCookie = "refresh_token";

    private readonly IConfiguration _config;

    public AuthController(IAuthService authService, ILogger<AuthController> logger, IConfiguration config)
    {
        _authService = authService;
        _logger      = logger;
        _config      = config;
    }

    // ── Вспомогательный метод: получить CookieOptions с конфигом ────────
    private CookieOptions GetAuthCookieOptions(string path)
    {
        var secureCookie = _config.GetValue("Cookie:Secure", true);
        var configuredSameSite = _config.GetValue<string>("Cookie:SameSite");
        var sameSite = ParseSameSite(configuredSameSite, secureCookie ? SameSiteMode.None : SameSiteMode.Lax);
        if (!secureCookie && sameSite == SameSiteMode.None)
            sameSite = SameSiteMode.Lax;

        return new CookieOptions
        {
            HttpOnly = true,
            Secure   = secureCookie,
            SameSite = sameSite,
            Path     = path
        };
    }

    // ── Вспомогательный метод: установить httpOnly cookies ──────────────
    private void SetAuthCookies(AuthResponseDto response)
    {
        var accessOptions = GetAuthCookieOptions("/");
        accessOptions.Expires = response.ExpiresAt;

        var refreshOptions = GetAuthCookieOptions("/api/auth/refresh");
        refreshOptions.Expires = response.RefreshExpiresAt;

        Response.Cookies.Append(AccessTokenCookie,  response.AccessToken,  accessOptions);
        Response.Cookies.Append(RefreshTokenCookie, response.RefreshToken, refreshOptions);
    }

    private void ClearAuthCookies()
    {
        // Удаляем cookies с теми же свойствами что и при создании (важно для правильной очистки)
        Response.Cookies.Delete(AccessTokenCookie,  GetAuthCookieOptions("/"));
        Response.Cookies.Delete(RefreshTokenCookie, GetAuthCookieOptions("/api/auth/refresh"));
    }

    private static SameSiteMode ParseSameSite(string? value, SameSiteMode fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
            return fallback;

        return Enum.TryParse<SameSiteMode>(value, ignoreCase: true, out var parsed)
            ? parsed
            : fallback;
    }

    private static bool IsAdminRole(string role)
    {
        return Enum.TryParse<UserRole>(role, ignoreCase: true, out var parsed)
               && parsed >= UserRole.Moderator;
    }

    // ── Регистрация ─────────────────────────────────────────────────────

    /// <summary>
    /// Регистрация нового пользователя.
    /// Создаёт аккаунт User + публичный Profile. Устанавливает httpOnly cookies.
    /// </summary>
    [HttpPost("register")]
    [EnableRateLimiting("register")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterDto dto,
        CancellationToken ct)
    {
        try
        {
            var response = await _authService.RegisterAsync(dto, ct);
            SetAuthCookies(response);
            return StatusCode(StatusCodes.Status201Created, response.User);
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ── Вход ────────────────────────────────────────────────────────────

    /// <summary>
    /// Вход в систему. Устанавливает httpOnly cookies с access и refresh токенами.
    /// </summary>
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(
        [FromBody] LoginDto dto,
        CancellationToken ct)
    {
        try
        {
            var response = await _authService.LoginAsync(dto, ct);
            if (IsAdminRole(response.User.Role))
            {
                ClearAuthCookies();
                return StatusCode(StatusCodes.Status403Forbidden,
                    new { error = "Для администраторов используйте отдельный вход: /admin-auth" });
            }

            SetAuthCookies(response);
            return Ok(response.User);
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Отдельный вход для администраторов (Moderator+).
    /// </summary>
    [HttpPost("admin/login")]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> AdminLogin(
        [FromBody] LoginDto dto,
        CancellationToken ct)
    {
        try
        {
            var response = await _authService.LoginAsync(dto, ct);
            if (!IsAdminRole(response.User.Role))
            {
                ClearAuthCookies();
                return StatusCode(StatusCodes.Status403Forbidden,
                    new { error = "Доступ разрешён только для Moderator/SeniorAdmin/HeadAdmin." });
            }

            SetAuthCookies(response);
            return Ok(response.User);
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ── Выход ────────────────────────────────────────────────────────────

    /// <summary>
    /// Выход из системы. Удаляет httpOnly cookies.
    /// </summary>
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout()
    {
        ClearAuthCookies();
        return NoContent();
    }

    // ── Обновление токена ────────────────────────────────────────────────

    /// <summary>
    /// Обновить access_token по refresh_token (из cookie).
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var refreshToken = Request.Cookies[RefreshTokenCookie];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { error = "Refresh token отсутствует." });

        try
        {
            var response = await _authService.RefreshAsync(refreshToken, ct);
            SetAuthCookies(response);
            return Ok(response.User);
        }
        catch (AuthException ex)
        {
            ClearAuthCookies();
            return Unauthorized(new { error = ex.Message });
        }
    }

    // ── Текущий пользователь ─────────────────────────────────────────────

    /// <summary>
    /// Информация о текущем авторизованном пользователе.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me(
        [FromServices] ISpecialtyService specialtyService,
        CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirst("sub")!.Value);
        var activeSpecialties = await specialtyService.GetActiveForUserAsync(userId, ct);

        return Ok(new UserDto(
            Id:              userId,
            Email:           User.FindFirst("email")!.Value,
            Role:            User.FindFirst("role")!.Value,
            ProfileId:       Guid.TryParse(User.FindFirst("profile_id")?.Value, out var pid) ? pid : null,
            ProfileName:     User.FindFirst("profile_name")?.Value ?? string.Empty,
            AccountType:     User.FindFirst("account_type")?.Value ?? string.Empty,
            IsEmailVerified: false,
            CreatedAt:       DateTime.UtcNow,
            Specialties:     activeSpecialties.Select(s => s.Specialty).ToList()
        ));
    }

    // ── Обновление профиля ───────────────────────────────────────────────

    /// <summary>
    /// Обновить имя / bio своего профиля.
    /// </summary>
    [HttpPatch("profile")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateProfileDto dto,
        CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));
        try
        {
            var result = await _authService.UpdateProfileAsync(userId, dto, ct);
            return Ok(result);
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
