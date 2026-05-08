using System.Security.Claims;
using Barnamaj.API.DTOs.Specialties;
using Barnamaj.API.Entities;
using Barnamaj.API.Filters;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Управление специализациями пользователей.
/// Выдача, просмотр, отзыв — только HeadAdmin.
/// </summary>
[ApiController]
[Route("api/admin/specialties")]
[Authorize]
[RequireRole(UserRole.HeadAdmin)]
[Produces("application/json")]
public sealed class AdminSpecialtyController : ControllerBase
{
    private readonly ISpecialtyService _specialtyService;
    private readonly IAuditService     _auditService;

    public AdminSpecialtyController(ISpecialtyService specialtyService, IAuditService auditService)
    {
        _specialtyService = specialtyService;
        _auditService     = auditService;
    }

    // ── GET /api/admin/specialties/{userId} ───────────────────────────────
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetForUser(Guid userId, CancellationToken ct)
    {
        var grants = await _specialtyService.GetForUserAsync(userId, ct);
        return Ok(grants);
    }

    // ── POST /api/admin/specialties/{userId} ──────────────────────────────
    [HttpPost("{userId:guid}")]
    public async Task<IActionResult> Grant(Guid userId, [FromBody] GrantSpecialtyDto dto, CancellationToken ct)
    {
        var adminIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(adminIdStr, out var adminId))
            return Unauthorized();

        var grant = await _specialtyService.GrantAsync(userId, dto, adminId, ct);

        await _auditService.LogAsync(
            adminId,
            "specialty.grant",
            userId,
            new { dto.Specialty, dto.ExpiresAt, dto.Note },
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            ct);

        return Ok(grant);
    }

    // ── DELETE /api/admin/specialties/{userId}/{specialty} ────────────────
    [HttpDelete("{userId:guid}/{specialty}")]
    public async Task<IActionResult> Revoke(Guid userId, Specialty specialty, CancellationToken ct)
    {
        var adminIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(adminIdStr, out var adminId))
            return Unauthorized();

        var removed = await _specialtyService.RevokeAsync(userId, specialty, ct);
        if (!removed)
            return NotFound(new { error = "Грант не найден.", code = "not_found" });

        await _auditService.LogAsync(
            adminId,
            "specialty.revoke",
            userId,
            new { Specialty = specialty.ToString() },
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            ct);

        return NoContent();
    }
}
