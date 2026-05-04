using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Базовый контроллер — все остальные контроллеры наследуют от него.
/// Содержит общие атрибуты и утилиты.
/// </summary>
[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public abstract class BaseApiController : ControllerBase
{
    protected IActionResult Problem(string detail, int statusCode = 400)
        => StatusCode(statusCode, new { error = detail, timestamp = DateTime.UtcNow });
}
