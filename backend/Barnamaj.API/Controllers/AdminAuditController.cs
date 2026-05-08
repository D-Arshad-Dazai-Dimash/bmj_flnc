using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Audit;
using Barnamaj.API.Entities;
using Barnamaj.API.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Просмотр журнала аудита административных действий.
/// Доступен только HeadAdmin.
/// </summary>
[ApiController]
[Route("api/admin/audit")]
[Authorize]
[RequireRole(UserRole.HeadAdmin)]
[Produces("application/json")]
public sealed class AdminAuditController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminAuditController(AppDbContext db) => _db = db;

    // ── GET /api/admin/audit ──────────────────────────────────────────────
    /// <summary>
    /// Постраничный список событий. Опциональные фильтры: adminId, targetUserId, action.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetLogs(
        [FromQuery] int    page         = 1,
        [FromQuery] int    pageSize     = 50,
        [FromQuery] Guid?  adminId      = null,
        [FromQuery] Guid?  targetUserId = null,
        [FromQuery] string? action      = null,
        CancellationToken ct = default)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page     = Math.Max(1, page);

        var query = _db.AdminAuditLogs
            .Include(l => l.Admin)
            .AsQueryable();

        if (adminId.HasValue)
            query = query.Where(l => l.AdminId == adminId.Value);

        if (targetUserId.HasValue)
            query = query.Where(l => l.TargetUserId == targetUserId.Value);

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(l => l.Action.StartsWith(action));

        var total = await query.CountAsync(ct);

        var rows = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        // Load target emails
        var targetIds = rows
            .Where(r => r.TargetUserId.HasValue)
            .Select(r => r.TargetUserId!.Value)
            .Distinct()
            .ToList();

        var targetEmails = await _db.Users
            .Where(u => targetIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Email })
            .ToDictionaryAsync(u => u.Id, u => u.Email, ct);

        var items = rows.Select(l => new AuditLogDto(
            l.Id,
            l.AdminId,
            l.Admin.Email,
            l.Action,
            l.TargetUserId,
            l.TargetUserId.HasValue ? targetEmails.GetValueOrDefault(l.TargetUserId.Value) : null,
            l.Payload,
            l.IpAddress,
            l.CreatedAt
        )).ToList();

        return Ok(new AuditLogPageDto(items, total, page, pageSize));
    }
}
