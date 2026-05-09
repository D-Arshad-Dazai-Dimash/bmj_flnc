using System.Security.Claims;
using Barnamaj.API.DTOs.Kyc;
using Barnamaj.API.Entities;
using Barnamaj.API.Filters;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Модерация KYC-документов. Доступ: Moderator / Admin.
/// </summary>
[ApiController]
[Route("api/kyc/moderation")]
[Authorize]
[RequireRole(UserRole.Moderator)]
[Produces("application/json")]
public sealed class KycModerationController : ControllerBase
{
    private readonly IKycModerationService _mod;
    public KycModerationController(IKycModerationService mod) => _mod = mod;

    private Guid ModeratorId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    [HttpGet("pending")]
    [ProducesResponseType(typeof(IReadOnlyList<PendingDocumentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Pending([FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var list = await _mod.ListPendingAsync(limit, ct);
        return Ok(list);
    }

    [HttpPost("{documentId:guid}/approve")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Approve(Guid documentId, CancellationToken ct)
    {
        try
        {
            await _mod.ApproveAsync(documentId, ModeratorId, HttpContext, ct);
            return Ok(new { ok = true });
        }
        catch (KycException ex) when (ex.Code == "not_found")
        {
            return NotFound(new { error = ex.Message, code = ex.Code });
        }
        catch (KycException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.Code });
        }
    }

    [HttpPost("{documentId:guid}/reject")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Reject(
        Guid documentId,
        [FromBody] RejectDocumentDto dto,
        CancellationToken ct)
    {
        try
        {
            await _mod.RejectAsync(documentId, ModeratorId, dto.Reason, HttpContext, ct);
            return Ok(new { ok = true });
        }
        catch (KycException ex) when (ex.Code == "not_found")
        {
            return NotFound(new { error = ex.Message, code = ex.Code });
        }
        catch (KycException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.Code });
        }
    }
}
