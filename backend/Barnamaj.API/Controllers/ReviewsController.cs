using System.Security.Claims;
using Barnamaj.API.DTOs.Reviews;
using Barnamaj.API.Entities;
using Barnamaj.API.Filters;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Двусторонние отзывы: создание после Completed-проекта, чтение по профилю,
/// модерация (скрыть / восстановить). Гейт: Lite KYC, чтобы не плодить
/// анонимный спам-рейтинг.
/// </summary>
[ApiController]
[Route("api")]
[Produces("application/json")]
public sealed class ReviewsController : ControllerBase
{
    private readonly IRatingService _rating;
    public ReviewsController(IRatingService rating) => _rating = rating;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    // ── Создание ─────────────────────────────────────────────

    [HttpPost("projects/{projectId:guid}/reviews")]
    [Authorize]
    [RequireKyc(KycStatus.Lite)]
    [ProducesResponseType(typeof(ReviewDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(Guid projectId, [FromBody] CreateReviewDto dto, CancellationToken ct)
    {
        try
        {
            var r = await _rating.CreateAsync(projectId, CurrentUserId, dto, ct);
            return StatusCode(StatusCodes.Status201Created, r);
        }
        catch (RatingException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message, code = ex.Code });
        }
    }

    // ── Чтение ───────────────────────────────────────────────

    [HttpGet("projects/{projectId:guid}/reviews")]
    [Authorize]
    [ProducesResponseType(typeof(IReadOnlyList<ReviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ForProject(Guid projectId, CancellationToken ct)
    {
        try
        {
            var list = await _rating.GetForProjectAsync(projectId, CurrentUserId, ct);
            return Ok(list);
        }
        catch (RatingException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message, code = ex.Code });
        }
    }

    [HttpGet("profiles/{profileId:guid}/reviews")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ReviewsPageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ForProfile(
        Guid profileId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        var p = await _rating.GetForProfileAsync(profileId, page, pageSize, ct);
        return Ok(p);
    }

    [HttpGet("profiles/{profileId:guid}/rating")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RatingSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary(Guid profileId, CancellationToken ct)
    {
        try
        {
            var s = await _rating.GetSummaryAsync(profileId, ct);
            return Ok(s);
        }
        catch (RatingException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message, code = ex.Code });
        }
    }

    [HttpGet("reviews/tags")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<string>), StatusCodes.Status200OK)]
    public IActionResult AvailableTags() => Ok(IRatingService.AvailableTags);
}

/// <summary>Модерация отзывов: скрыть / восстановить (с пересчётом рейтинга).</summary>
[ApiController]
[Route("api/admin/reviews")]
[Authorize]
[RequireRole(UserRole.Moderator)]
[Produces("application/json")]
public sealed class AdminReviewsController : ControllerBase
{
    private readonly IRatingService _rating;
    public AdminReviewsController(IRatingService rating) => _rating = rating;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    [HttpGet]
    [ProducesResponseType(typeof(ReviewsPageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListRecent(
        [FromQuery] int  page = 1,
        [FromQuery] int  pageSize = 20,
        [FromQuery] bool? hidden = null,
        CancellationToken ct = default)
    {
        var p = await _rating.ListRecentAsync(page, pageSize, hidden, ct);
        return Ok(p);
    }

    [HttpPost("{reviewId:guid}/hide")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Hide(Guid reviewId, [FromBody] HideReviewDto dto, CancellationToken ct)
    {
        try
        {
            await _rating.HideAsync(reviewId, CurrentUserId, dto.Reason, ct);
            return Ok(new { ok = true });
        }
        catch (RatingException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message, code = ex.Code });
        }
    }

    [HttpPost("{reviewId:guid}/restore")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Restore(Guid reviewId, CancellationToken ct)
    {
        try
        {
            await _rating.RestoreAsync(reviewId, CurrentUserId, ct);
            return Ok(new { ok = true });
        }
        catch (RatingException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message, code = ex.Code });
        }
    }
}
