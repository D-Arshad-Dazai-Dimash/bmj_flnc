using System.Security.Claims;
using Barnamaj.API.DTOs.Profiles;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Управление профилями кланов и компаний на платформе Barnamaj.
///
/// Все эндпоинты требуют авторизации — UserId извлекается из JWT-токена.
/// </summary>
[ApiController]
[Route("api/profiles")]
[Authorize]
[Produces("application/json")]
public sealed class ProfilesController : ControllerBase
{
    private readonly IProfileService           _profileService;
    private readonly ILogger<ProfilesController> _logger;

    public ProfilesController(
        IProfileService profileService,
        ILogger<ProfilesController> logger)
    {
        _profileService = profileService;
        _logger         = logger;
    }

    // ── Утилита: UserId из JWT ────────────────────────────────
    /// <summary>
    /// Извлекаем UserId из claim "sub" в JWT-токене.
    /// MapInboundClaims = false — поэтому имя claim именно "sub", не NameIdentifier.
    /// </summary>
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    // ════════════════════════════════════════════════════════════
    // GET /api/profiles
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Публичный поиск профилей (кланы и компании).
    /// </summary>
    /// <param name="q">Поисковый запрос (по названию / bio)</param>
    /// <response code="200">Список профилей.</response>
    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "q" })]
    [ProducesResponseType(typeof(IReadOnlyList<ProfileSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        CancellationToken ct)
    {
        var result = await _profileService.SearchAsync(q, ct);
        return Ok(result);
    }

    // ════════════════════════════════════════════════════════════
    // GET /api/profiles/{id}
    // ════════════════════════════════════════════════════════════

    /// <summary>Публичная карточка профиля по Id.</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ProfileSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var dto = await _profileService.GetByIdAsync(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    // ════════════════════════════════════════════════════════════
    // POST /api/profiles/create
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Создаёт новый профиль клана (Clan) или компании (Company).
    /// </summary>
    /// <remarks>
    /// Текущий пользователь автоматически становится Owner (владельцем).
    ///
    ///     POST /api/profiles/create
    ///     {
    ///       "name":        "DevClan",
    ///       "bio":         "Команда опытных разработчиков",
    ///       "accountType": 3
    ///     }
    ///
    /// accountType допустимые значения: **2** (Company) или **3** (Clan).
    /// </remarks>
    /// <response code="201">Профиль создан. Возвращает ProfileSummaryDto.</response>
    /// <response code="400">Ошибка валидации.</response>
    /// <response code="401">Не авторизован.</response>
    [HttpPost("create")]
    [ProducesResponseType(typeof(ProfileSummaryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails),   StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateProfileDto dto,
        CancellationToken ct)
    {
        try
        {
            var result = await _profileService.CreateProfileAsync(dto, CurrentUserId, ct);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (ProfileException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    // ════════════════════════════════════════════════════════════
    // POST /api/profiles/{id}/invite
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Отправляет приглашение пользователю по email.
    /// </summary>
    /// <remarks>
    /// Только **Owner** данного профиля может приглашать участников.
    /// Создаёт запись в таблице Memberships со статусом **Pending**.
    ///
    ///     POST /api/profiles/3fa85f64-5717-4562-b3fc-2c963f66afa6/invite
    ///     {
    ///       "email": "alice@example.com"
    ///     }
    /// </remarks>
    /// <response code="200">Приглашение отправлено. Возвращает InviteResponseDto.</response>
    /// <response code="400">Email не найден / уже в группе / ошибка валидации.</response>
    /// <response code="403">Нет прав (не Owner).</response>
    /// <response code="404">Профиль не найден.</response>
    [HttpPost("{id:guid}/invite")]
    [ProducesResponseType(typeof(InviteResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails),    StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails),    StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails),    StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Invite(
        [FromRoute] Guid id,
        [FromBody]  InviteUserDto dto,
        CancellationToken ct)
    {
        try
        {
            var result = await _profileService.InviteUserAsync(id, dto, CurrentUserId, ct);
            return Ok(result);
        }
        catch (ProfileException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    // ════════════════════════════════════════════════════════════
    // GET /api/profiles/my-teams
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Возвращает список кланов и компаний, в которых состоит текущий пользователь.
    /// </summary>
    /// <remarks>
    /// Включает как активные членства (Active), так и ожидающие приглашения (Pending).
    ///
    ///     GET /api/profiles/my-teams
    ///     Authorization: Bearer {token}
    /// </remarks>
    /// <response code="200">Список команд с ролью пользователя.</response>
    /// <response code="401">Не авторизован.</response>
    [HttpGet("my-teams")]
    [ProducesResponseType(typeof(IReadOnlyList<MyTeamDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MyTeams(CancellationToken ct)
    {
        var teams = await _profileService.GetMyTeamsAsync(CurrentUserId, ct);
        return Ok(teams);
    }
}
