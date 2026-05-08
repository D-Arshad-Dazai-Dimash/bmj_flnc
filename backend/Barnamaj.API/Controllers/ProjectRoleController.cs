using System.Security.Claims;
using Barnamaj.API.DTOs.ProjectRoles;
using Barnamaj.API.Entities;
using Barnamaj.API.Filters;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/roles")]
[Authorize]
public class ProjectRoleController : BaseApiController
{
    private readonly IProjectRoleService _svc;
    private readonly IAuditService       _audit;

    public ProjectRoleController(IProjectRoleService svc, IAuditService audit)
    {
        _svc   = svc;
        _audit = audit;
    }

    [HttpGet]
    [RequireRole(UserRole.Moderator)]
    public async Task<IActionResult> GetForProject(Guid projectId, CancellationToken ct)
    {
        var list = await _svc.GetForProjectAsync(projectId, ct);
        return Ok(list);
    }

    [HttpPost]
    [RequireRole(UserRole.SeniorAdmin)]
    public async Task<IActionResult> Grant(Guid projectId, [FromBody] GrantProjectRoleDto dto, CancellationToken ct)
    {
        var adminId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var grant   = await _svc.GrantAsync(projectId, dto.UserId, dto.Role, adminId, ct);
        await _audit.LogAsync(adminId, "project_role.grant", dto.UserId,
            new { projectId, role = dto.Role.ToString() }, HttpContext.Connection.RemoteIpAddress?.ToString(), ct);
        return Ok(grant);
    }

    [HttpDelete("{grantId:guid}")]
    [RequireRole(UserRole.SeniorAdmin)]
    public async Task<IActionResult> Revoke(Guid projectId, Guid grantId, CancellationToken ct)
    {
        var adminId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _svc.RevokeAsync(grantId, ct);
        await _audit.LogAsync(adminId, "project_role.revoke", null,
            new { projectId, grantId }, HttpContext.Connection.RemoteIpAddress?.ToString(), ct);
        return NoContent();
    }
}
