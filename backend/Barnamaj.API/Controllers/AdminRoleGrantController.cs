using System.Security.Claims;
using Barnamaj.API.DTOs.RoleGrants;
using Barnamaj.API.Entities;
using Barnamaj.API.Filters;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Управление временными и постоянными грантами системных ролей.
/// Только HeadAdmin: выдать, просмотреть, отозвать.
/// </summary>
[ApiController]
[Route("api/admin/role-grants")]
[Authorize]
[RequireRole(UserRole.HeadAdmin)]
[Produces("application/json")]
public sealed class AdminRoleGrantController : ControllerBase
{
    private readonly IRoleGrantService _roleGrantService;
    private readonly IAuditService     _auditService;

    public AdminRoleGrantController(IRoleGrantService roleGrantService, IAuditService auditService)
    {
        _roleGrantService = roleGrantService;
        _auditService     = auditService;
    }

    private Guid CurrentAdminId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    // ── GET /api/admin/role-grants/{userId} ───────────────────────────────
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetForUser(Guid userId, CancellationToken ct)
    {
        var grants = await _roleGrantService.GetGrantsForUserAsync(userId, ct);
        return Ok(grants);
    }

    // ── GET /api/admin/role-grants/{userId}/effective ─────────────────────
    [HttpGet("{userId:guid}/effective")]
    public async Task<IActionResult> GetEffectiveRole(Guid userId, CancellationToken ct)
    {
        var role = await _roleGrantService.GetEffectiveRoleAsync(userId, ct);
        return Ok(new { role = role.ToString(), roleValue = (byte)role });
    }

    // ── POST /api/admin/role-grants/{userId} ──────────────────────────────
    [HttpPost("{userId:guid}")]
    public async Task<IActionResult> Grant(Guid userId, [FromBody] GrantRoleDto dto, CancellationToken ct)
    {
        var adminId = CurrentAdminId;
        var grant = await _roleGrantService.GrantAsync(userId, dto, adminId, ct);

        await _auditService.LogAsync(
            adminId,
            "role.grant",
            userId,
            new { dto.GrantedRole, dto.ExpiresAt, dto.Reason },
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            ct);

        return Ok(grant);
    }

    // ── DELETE /api/admin/role-grants/{grantId} ───────────────────────────
    [HttpDelete("{grantId:guid}")]
    public async Task<IActionResult> Revoke(Guid grantId, CancellationToken ct)
    {
        var adminId = CurrentAdminId;
        var revoked = await _roleGrantService.RevokeAsync(grantId, ct);
        if (!revoked)
            return NotFound(new { error = "Грант не найден или уже отозван.", code = "not_found" });

        await _auditService.LogAsync(
            adminId,
            "role.revoke",
            null,
            new { GrantId = grantId },
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            ct);

        return NoContent();
    }
}
