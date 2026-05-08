using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Specialties;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

public interface ISpecialtyService
{
    Task<List<SpecialtyGrantDto>> GetForUserAsync(Guid userId, CancellationToken ct = default);
    Task<List<SpecialtyGrantDto>> GetActiveForUserAsync(Guid userId, CancellationToken ct = default);
    Task<SpecialtyGrantDto>       GrantAsync(Guid userId, GrantSpecialtyDto dto, Guid grantedByAdminId, CancellationToken ct = default);
    Task<bool>                    RevokeAsync(Guid userId, Specialty specialty, CancellationToken ct = default);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

public class SpecialtyService : ISpecialtyService
{
    private readonly AppDbContext _db;

    public SpecialtyService(AppDbContext db) => _db = db;

    // ── helpers ────────────────────────────────────────────────────────────

    private static bool IsActive(UserSpecialtyGrant g) =>
        g.ExpiresAt == null || g.ExpiresAt > DateTime.UtcNow;

    private static SpecialtyGrantDto Map(UserSpecialtyGrant g) =>
        new(g.Id, g.Specialty.ToString(), g.ExpiresAt, g.GrantedByAdminId, g.Note, g.CreatedAt, IsActive(g));

    // ── reads ──────────────────────────────────────────────────────────────

    public async Task<List<SpecialtyGrantDto>> GetForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var grants = await _db.UserSpecialtyGrants
            .Where(g => g.UserId == userId)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync(ct);
        return grants.Select(Map).ToList();
    }

    public async Task<List<SpecialtyGrantDto>> GetActiveForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var grants = await _db.UserSpecialtyGrants
            .Where(g => g.UserId == userId && (g.ExpiresAt == null || g.ExpiresAt > now))
            .ToListAsync(ct);
        return grants.Select(Map).ToList();
    }

    // ── writes ─────────────────────────────────────────────────────────────

    public async Task<SpecialtyGrantDto> GrantAsync(
        Guid userId,
        GrantSpecialtyDto dto,
        Guid grantedByAdminId,
        CancellationToken ct = default)
    {
        // Upsert: если грант уже существует — обновить ExpiresAt
        var existing = await _db.UserSpecialtyGrants
            .FirstOrDefaultAsync(g => g.UserId == userId && g.Specialty == dto.Specialty, ct);

        if (existing is not null)
        {
            existing.ExpiresAt        = dto.ExpiresAt;
            existing.Note             = dto.Note;
            existing.GrantedByAdminId = grantedByAdminId;
        }
        else
        {
            existing = new UserSpecialtyGrant
            {
                UserId           = userId,
                Specialty        = dto.Specialty,
                ExpiresAt        = dto.ExpiresAt,
                GrantedByAdminId = grantedByAdminId,
                Note             = dto.Note,
                CreatedAt        = DateTime.UtcNow,
            };
            _db.UserSpecialtyGrants.Add(existing);
        }

        await _db.SaveChangesAsync(ct);
        return Map(existing);
    }

    public async Task<bool> RevokeAsync(Guid userId, Specialty specialty, CancellationToken ct = default)
    {
        var grant = await _db.UserSpecialtyGrants
            .FirstOrDefaultAsync(g => g.UserId == userId && g.Specialty == specialty, ct);
        if (grant is null) return false;
        _db.UserSpecialtyGrants.Remove(grant);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
