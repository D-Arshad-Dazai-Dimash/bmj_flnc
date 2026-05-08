using Barnamaj.API.Data;
using Barnamaj.API.DTOs.RoleGrants;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

public interface IRoleGrantService
{
    /// <summary>Эффективная роль пользователя (users.role OR max active grant role).</summary>
    Task<UserRole>            GetEffectiveRoleAsync(Guid userId, CancellationToken ct = default);
    Task<List<RoleGrantDto>>  GetGrantsForUserAsync(Guid userId, CancellationToken ct = default);
    Task<RoleGrantDto>        GrantAsync(Guid userId, GrantRoleDto dto, Guid grantedByAdminId, CancellationToken ct = default);
    Task<bool>                RevokeAsync(Guid grantId, CancellationToken ct = default);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

public class RoleGrantService : IRoleGrantService
{
    private readonly AppDbContext _db;

    public RoleGrantService(AppDbContext db) => _db = db;

    // ── helpers ────────────────────────────────────────────────────────────

    private static bool IsActive(UserRoleGrant g) =>
        !g.IsRevoked && (g.ExpiresAt == null || g.ExpiresAt > DateTime.UtcNow);

    private static RoleGrantDto Map(UserRoleGrant g) =>
        new(g.Id, g.GrantedRole.ToString(), g.ExpiresAt, g.GrantedByAdminId, g.Reason, g.IsRevoked, IsActive(g), g.CreatedAt);

    // ── effective role ─────────────────────────────────────────────────────

    public async Task<UserRole> GetEffectiveRoleAsync(Guid userId, CancellationToken ct = default)
    {
        var baseRole = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => (UserRole?)u.Role)
            .FirstOrDefaultAsync(ct) ?? UserRole.Member;

        var now = DateTime.UtcNow;
        var maxGrantRole = await _db.UserRoleGrants
            .Where(g => g.UserId == userId && !g.IsRevoked && (g.ExpiresAt == null || g.ExpiresAt > now))
            .Select(g => (UserRole?)g.GrantedRole)
            .ToListAsync(ct);

        if (!maxGrantRole.Any()) return baseRole;
        var grantMax = maxGrantRole.Max()!.Value;
        return (byte)grantMax > (byte)baseRole ? grantMax : baseRole;
    }

    // ── reads ──────────────────────────────────────────────────────────────

    public async Task<List<RoleGrantDto>> GetGrantsForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var grants = await _db.UserRoleGrants
            .Where(g => g.UserId == userId)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync(ct);
        return grants.Select(Map).ToList();
    }

    // ── writes ─────────────────────────────────────────────────────────────

    public async Task<RoleGrantDto> GrantAsync(Guid userId, GrantRoleDto dto, Guid grantedByAdminId, CancellationToken ct = default)
    {
        var grant = new UserRoleGrant
        {
            UserId           = userId,
            GrantedRole      = dto.GrantedRole,
            ExpiresAt        = dto.ExpiresAt,
            GrantedByAdminId = grantedByAdminId,
            Reason           = dto.Reason,
            CreatedAt        = DateTime.UtcNow,
        };
        _db.UserRoleGrants.Add(grant);
        await _db.SaveChangesAsync(ct);
        return Map(grant);
    }

    public async Task<bool> RevokeAsync(Guid grantId, CancellationToken ct = default)
    {
        var grant = await _db.UserRoleGrants.FindAsync([grantId], ct);
        if (grant is null || grant.IsRevoked) return false;
        grant.IsRevoked = true;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
