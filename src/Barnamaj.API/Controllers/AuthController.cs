using Barnamaj.API.DTOs.Auth;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Аутентификация и регистрация пользователей Barnamaj.
/// </summary>
[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger      = logger;
    }

    /// <summary>
    /// Регистрация нового пользователя.
    /// Создаёт аккаунт User + публичный Profile в одной транзакции.
    /// </summary>
    /// <remarks>
    /// accountType допустимые значения: **1** (Individual) или **2** (Company).
    ///
    ///     POST /api/auth/register
    ///     {
    ///        "email":       "john@example.com",
    ///        "password":    "Secret123",
    ///        "name":        "John Doe",
    ///        "accountType": 1,
    ///        "bio":         "Full-stack developer"
    ///     }
    /// </remarks>
    /// <response code="201">Пользователь создан, возвращает JWT-токен.</response>
    /// <response code="400">Ошибка валидации или email уже занят.</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterDto dto,
        CancellationToken ct)
    {
        try
        {
            var response = await _authService.RegisterAsync(dto, ct);
            return StatusCode(StatusCodes.Status201Created, response);
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Вход в систему.
    /// Возвращает JWT Bearer токен при верных учётных данных.
    /// </summary>
    /// <remarks>
    ///     POST /api/auth/login
    ///     {
    ///        "email":    "john@example.com",
    ///        "password": "Secret123"
    ///     }
    /// </remarks>
    /// <response code="200">Успешный вход, возвращает JWT-токен.</response>
    /// <response code="400">Неверный email или пароль.</response>
    /// <response code="401">Аккаунт заблокирован.</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login(
        [FromBody] LoginDto dto,
        CancellationToken ct)
    {
        try
        {
            var response = await _authService.LoginAsync(dto, ct);
            return Ok(response);
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Обновить имя / bio своего профиля.
    /// </summary>
    /// <response code="200">Обновлённый UserDto.</response>
    /// <response code="401">Не авторизован.</response>
    [HttpPatch("profile")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
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

    /// <summary>
    /// Проверить, авторизован ли текущий пользователь.
    /// Требует валидный Bearer токен в заголовке Authorization.
    /// </summary>
    /// <response code="200">Токен валиден.</response>
    /// <response code="401">Токен отсутствует или истёк.</response>
    [HttpGet("me")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public IActionResult Me()
    {
        var claims = User.Claims.Select(c => new { c.Type, c.Value });
        return Ok(new
        {
            userId      = User.FindFirst("sub")?.Value,
            email       = User.FindFirst("email")?.Value,
            role        = User.FindFirst("role")?.Value,
            accountType = User.FindFirst("account_type")?.Value,
            profileName = User.FindFirst("profile_name")?.Value,
        });
    }
}
