using System.Security.Claims;
using Barnamaj.API.Data;
using Barnamaj.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Filters;

/// <summary>
/// Requires the current user to have a specific ProjectRole grant for the project
/// identified by route parameter {projectId:guid}.
/// SeniorAdmin+ bypass the check.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public sealed class RequireProjectRoleAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly ProjectRole _role;

    public RequireProjectRoleAttribute(ProjectRole role) => _role = role;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (!user.Identity?.IsAuthenticated ?? true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        // SeniorAdmin+ bypass
        if (Enum.TryParse<UserRole>(user.FindFirstValue("role"), out var userRole) && userRole >= UserRole.SeniorAdmin)
            return;

        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();

        if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            context.Result = new ForbidResult();
            return;
        }

        // Get projectId from route
        var routeValues = context.RouteData.Values;
        if (!routeValues.TryGetValue("projectId", out var pidRaw) || !Guid.TryParse(pidRaw?.ToString(), out var projectId))
        {
            // Fallback to {id}
            if (!routeValues.TryGetValue("id", out pidRaw) || !Guid.TryParse(pidRaw?.ToString(), out projectId))
            {
                context.Result = new ForbidResult();
                return;
            }
        }

        var hasGrant = await db.ProjectRoleGrants
            .AnyAsync(g => g.ProjectId == projectId && g.UserId == userId && g.Role == _role);

        if (!hasGrant)
            context.Result = new ForbidResult();
    }
}
