using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Управление аккаунтом текущего пользователя.
/// Авторизация и публичный профиль — в AuthController/ProfilesController.
/// </summary>
[ApiController]
[Route("api/users")]
[Produces("application/json")]
[Authorize]
public sealed class UsersController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IAuthService authService, ILogger<UsersController> logger)
    {
        _authService = authService;
        _logger      = logger;
    }

    /// <summary>
    /// Удалить аккаунт текущего пользователя (soft-delete).
    /// Профиль и связанные данные сохраняются для аудита; вход блокируется.
    /// </summary>
    [HttpDelete("me")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteMe(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

        try
        {
            await _authService.SoftDeleteAccountAsync(userId, ct);
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        // Очищаем cookies, чтобы клиент сразу разлогинился
        AuthController.ClearAuthCookies(Response);
        return NoContent();
    }
}
