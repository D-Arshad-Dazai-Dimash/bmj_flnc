using System.Text.Json;
using Barnamaj.API.Data;
using Barnamaj.API.Entities;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

public interface IAuditService
{
    /// <summary>
    /// Записать административное действие в audit log.
    /// Вызывать после успешного изменения данных.
    /// </summary>
    Task LogAsync(
        Guid    adminId,
        string  action,
        Guid?   targetUserId = null,
        object? payload      = null,
        string? ipAddress    = null,
        CancellationToken ct = default);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;

    public AuditService(AppDbContext db) => _db = db;

    public async Task LogAsync(
        Guid    adminId,
        string  action,
        Guid?   targetUserId = null,
        object? payload      = null,
        string? ipAddress    = null,
        CancellationToken ct = default)
    {
        var entry = new AdminAuditLog
        {
            AdminId      = adminId,
            Action       = action,
            TargetUserId = targetUserId,
            Payload      = payload is null ? null : JsonSerializer.Serialize(payload),
            IpAddress    = ipAddress,
            CreatedAt    = DateTime.UtcNow,
        };
        _db.AdminAuditLogs.Add(entry);
        await _db.SaveChangesAsync(ct);
    }
}
