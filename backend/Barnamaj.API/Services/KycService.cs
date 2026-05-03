using System.Text.Json;
using Barnamaj.API.Data;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

/// <summary>
/// KYC-операции уровня бизнес-логики: запись событий и обновление статуса.
/// </summary>
public interface IKycService
{
    Task LogAsync(Guid userId, string eventType, string? provider = null,
                  string? providerRef = null, object? payload = null,
                  CancellationToken ct = default);

    Task SetStatusAsync(Guid userId, KycStatus status, string? providerRef = null,
                        CancellationToken ct = default);
}

public sealed class KycService : IKycService
{
    private readonly AppDbContext _db;
    public KycService(AppDbContext db) => _db = db;

    public async Task LogAsync(Guid userId, string eventType, string? provider = null,
                               string? providerRef = null, object? payload = null,
                               CancellationToken ct = default)
    {
        _db.KycEvents.Add(new KycEvent
        {
            UserId      = userId,
            EventType   = eventType,
            Provider    = provider,
            ProviderRef = providerRef,
            PayloadJson = payload is null ? null : JsonSerializer.Serialize(payload),
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task SetStatusAsync(Guid userId, KycStatus status, string? providerRef = null,
                                     CancellationToken ct = default)
    {
        await _db.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.KycStatus,      status)
                .SetProperty(u => u.KycProviderRef, providerRef ?? (string?)null)
                .SetProperty(u => u.KycVerifiedAt,
                    status >= KycStatus.Lite ? DateTime.UtcNow : (DateTime?)null), ct);
    }
}
