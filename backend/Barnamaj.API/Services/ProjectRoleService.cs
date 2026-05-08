using Barnamaj.API.Data;
using Barnamaj.API.DTOs.ProjectRoles;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

public interface IProjectRoleService
{
    Task<List<ProjectRoleGrantDto>> GetForProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<ProjectRoleGrantDto>       GrantAsync(Guid projectId, Guid userId, ProjectRole role, Guid adminId, CancellationToken ct = default);
    Task                            RevokeAsync(Guid grantId, CancellationToken ct = default);
}

public class ProjectRoleService : IProjectRoleService
{
    private readonly AppDbContext _db;

    public ProjectRoleService(AppDbContext db) => _db = db;

    public async Task<List<ProjectRoleGrantDto>> GetForProjectAsync(Guid projectId, CancellationToken ct = default)
    {
        return await _db.ProjectRoleGrants
            .Where(g => g.ProjectId == projectId)
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new ProjectRoleGrantDto(
                g.Id, g.ProjectId, g.UserId,
                g.Role.ToString(), g.GrantedByAdminId, g.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<ProjectRoleGrantDto> GrantAsync(Guid projectId, Guid userId, ProjectRole role, Guid adminId, CancellationToken ct = default)
    {
        var grant = new ProjectRoleGrant
        {
            Id               = Guid.NewGuid(),
            ProjectId        = projectId,
            UserId           = userId,
            Role             = role,
            GrantedByAdminId = adminId,
            CreatedAt        = DateTime.UtcNow,
        };
        _db.ProjectRoleGrants.Add(grant);
        await _db.SaveChangesAsync(ct);
        return new ProjectRoleGrantDto(grant.Id, grant.ProjectId, grant.UserId,
            grant.Role.ToString(), grant.GrantedByAdminId, grant.CreatedAt);
    }

    public async Task RevokeAsync(Guid grantId, CancellationToken ct = default)
    {
        var grant = await _db.ProjectRoleGrants.FindAsync([grantId], ct)
            ?? throw new InvalidOperationException("Grant not found");
        _db.ProjectRoleGrants.Remove(grant);
        await _db.SaveChangesAsync(ct);
    }
}
