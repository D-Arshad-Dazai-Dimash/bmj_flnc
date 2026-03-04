using System.Security.Claims;
using Barnamaj.API.DTOs.Projects;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Управление проектами (техническими заданиями) платформы Barnamaj.
/// </summary>
[ApiController]
[Route("api/projects")]
[Produces("application/json")]
public sealed class ProjectsController : ControllerBase
{
    private readonly IProjectService           _projectService;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(
        IProjectService projectService,
        ILogger<ProjectsController> logger)
    {
        _projectService = projectService;
        _logger         = logger;
    }

    // ── Утилита: UserId из JWT ────────────────────────────────
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    // ════════════════════════════════════════════════════════════
    // POST /api/projects
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Создаёт новый проект (ТЗ) от имени профиля-заказчика.
    /// </summary>
    /// <remarks>
    /// Текущий пользователь должен быть **Owner** указанного clientProfileId.
    ///
    ///     POST /api/projects
    ///     {
    ///       "title":           "Разработка API для маркетплейса",
    ///       "description":     "Нужен REST API с авторизацией...",
    ///       "clientProfileId": "guid-профиля-компании",
    ///       "budget":          5000.00,
    ///       "deadline":        "2026-06-01T00:00:00Z"
    ///     }
    /// </remarks>
    /// <response code="201">Проект создан.</response>
    /// <response code="400">Ошибка валидации.</response>
    /// <response code="403">Нет прав (не Owner профиля).</response>
    /// <response code="404">Профиль не найден.</response>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ProjectDetailDto),  StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails),    StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails),    StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create(
        [FromBody] CreateProjectDto dto,
        CancellationToken ct)
    {
        try
        {
            var result = await _projectService.CreateProjectAsync(dto, CurrentUserId, ct);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (ProjectException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    // ════════════════════════════════════════════════════════════
    // GET /api/projects/my
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Возвращает проекты текущего пользователя (где он владелец профиля-заказчика).
    /// </summary>
    /// <response code="200">Список проектов пользователя.</response>
    /// <response code="401">Не авторизован.</response>
    [HttpGet("my")]
    [Authorize]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> My(CancellationToken ct)
    {
        var result = await _projectService.GetMyProjectsAsync(CurrentUserId, ct);
        return Ok(result);
    }

    // ════════════════════════════════════════════════════════════
    // GET /api/projects/feed
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Публичная лента открытых проектов (без авторизации).
    /// </summary>
    /// <remarks>
    /// Возвращает проекты со статусом **Open**, сортировка: новые первыми.
    ///
    ///     GET /api/projects/feed?page=1&amp;pageSize=20
    /// </remarks>
    /// <param name="page">Номер страницы (от 1)</param>
    /// <param name="pageSize">Размер страницы (1–50, по умолчанию 20)</param>
    /// <response code="200">Список проектов.</response>
    [HttpGet("feed")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Feed(
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct     = default)
    {
        var result = await _projectService.GetFeedAsync(page, pageSize, ct);
        return Ok(result);
    }

    // ════════════════════════════════════════════════════════════
    // POST /api/projects/{id}/apply
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Подаёт заявку на выполнение проекта от имени профиля-исполнителя.
    /// </summary>
    /// <remarks>
    /// Текущий пользователь должен быть **активным участником** профиля-исполнителя.
    /// На один проект от одного профиля — одна заявка.
    ///
    ///     POST /api/projects/guid-проекта/apply
    ///     {
    ///       "applicantProfileId": "guid-профиля-исполнителя",
    ///       "coverLetter":        "Мы специализируемся на REST API...",
    ///       "proposedBudget":     4500.00
    ///     }
    /// </remarks>
    /// <response code="201">Заявка подана.</response>
    /// <response code="400">Уже есть заявка / проект не открыт / ошибка валидации.</response>
    /// <response code="403">Нет прав (не участник профиля).</response>
    /// <response code="404">Проект или профиль не найдены.</response>
    [HttpPost("{id:guid}/apply")]
    [Authorize]
    [ProducesResponseType(typeof(ApplicationResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails),         StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails),         StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails),         StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Apply(
        [FromRoute] Guid id,
        [FromBody]  ApplyToProjectDto dto,
        CancellationToken ct)
    {
        try
        {
            var result = await _projectService.ApplyAsync(id, dto, CurrentUserId, ct);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (ProjectException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }
}
