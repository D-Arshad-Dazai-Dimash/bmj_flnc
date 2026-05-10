using System.Security.Cryptography;
using System.Text;
using Barnamaj.API.Data;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

/// <summary>
/// \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u043e\u043f\u044b\u0442\u043a\u0438 \u0432\u0430\u043b\u0438\u0434\u0430\u0446\u0438\u0438 + rotation refresh-\u0442\u043e\u043a\u0435\u043d\u0430.
/// </summary>
public enum RefreshValidationResult
{
    Valid,
    NotFound,
    Expired,
    Revoked,
    /// <summary>\u041f\u0440\u0438\u0448\u0451\u043b \u0443\u0436\u0435 \u0440\u043e\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 (\u0440\u0430\u043d\u0435\u0435 revoked) \u0442\u043e\u043a\u0435\u043d \u2014 \u043f\u0440\u0438\u0437\u043d\u0430\u043a \u043a\u0440\u0430\u0436\u0438. \u0412\u0441\u044f family \u043e\u0442\u043e\u0437\u0432\u0430\u043d\u0430.</summary>
    ReuseDetected,
    UserDisabled
}

public interface IRefreshTokenStore
{
    Task IssueAsync(Guid jti, Guid userId, Guid familyId, string token, DateTime expiresAt,
        string? ipAddress, string? userAgent, CancellationToken ct = default);

    /// <summary>
    /// \u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0442\u043e\u043a\u0435\u043d \u043f\u043e jti+hash. \u0415\u0441\u043b\u0438 \u043e\u043a \u2014 \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 familyId \u0434\u043b\u044f rotation.
    /// \u0415\u0441\u043b\u0438 reuse \u2014 \u043e\u0442\u0437\u044b\u0432\u0430\u0435\u0442 \u0432\u0441\u044e family \u0438 \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 ReuseDetected.
    /// </summary>
    Task<(RefreshValidationResult Result, Guid FamilyId)> ValidateAsync(Guid jti, string token, CancellationToken ct = default);

    /// <summary>\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0442\u043e\u043a\u0435\u043d \u043a\u0430\u043a rotated, \u0441\u0432\u044f\u0437\u0430\u0432 \u0441 \u043d\u043e\u0432\u044b\u043c jti.</summary>
    Task MarkRotatedAsync(Guid oldJti, Guid newJti, CancellationToken ct = default);

    /// <summary>\u041e\u0442\u043e\u0437\u0432\u0430\u0442\u044c \u0442\u043e\u043a\u0435\u043d \u043f\u043e jti (logout).</summary>
    Task RevokeAsync(Guid jti, string reason, CancellationToken ct = default);

    /// <summary>\u041e\u0442\u043e\u0437\u0432\u0430\u0442\u044c \u0432\u0441\u0435 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0442\u043e\u043a\u0435\u043d\u044b family.</summary>
    Task RevokeFamilyAsync(Guid familyId, string reason, CancellationToken ct = default);

    /// <summary>\u041e\u0442\u043e\u0437\u0432\u0430\u0442\u044c \u0432\u0441\u0435 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0442\u043e\u043a\u0435\u043d\u044b \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f (logout-everywhere).</summary>
    Task RevokeAllForUserAsync(Guid userId, string reason, CancellationToken ct = default);

    /// <summary>SHA-256 \u043e\u0442 \u0441\u0442\u0440\u043e\u043a\u0438 \u0442\u043e\u043a\u0435\u043d\u0430 (hex).</summary>
    static string ComputeHash(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }
}

public sealed class RefreshTokenStore : IRefreshTokenStore
{
    private readonly AppDbContext _db;
    private readonly ILogger<RefreshTokenStore> _logger;

    public RefreshTokenStore(AppDbContext db, ILogger<RefreshTokenStore> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task IssueAsync(Guid jti, Guid userId, Guid familyId, string token, DateTime expiresAt,
        string? ipAddress, string? userAgent, CancellationToken ct = default)
    {
        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = jti,
            UserId = userId,
            FamilyId = familyId,
            TokenHash = IRefreshTokenStore.ComputeHash(token),
            ExpiresAt = expiresAt,
            IpAddress = ipAddress,
            UserAgent = userAgent
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<(RefreshValidationResult Result, Guid FamilyId)> ValidateAsync(Guid jti, string token, CancellationToken ct = default)
    {
        var record = await _db.RefreshTokens
            .FirstOrDefaultAsync(x => x.Id == jti, ct);

        if (record is null)
            return (RefreshValidationResult.NotFound, Guid.Empty);

        var hash = IRefreshTokenStore.ComputeHash(token);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(record.TokenHash),
                Encoding.UTF8.GetBytes(hash)))
        {
            // \u0425\u044d\u0448 \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u043b \u2014 \u043f\u043e\u0434\u043c\u0435\u043d\u0430. \u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c \u043a\u0430\u043a NotFound (\u043d\u0435 \u0440\u0430\u0441\u043a\u0440\u044b\u0432\u0430\u0435\u043c \u0444\u0430\u043a\u0442 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u043e\u0432\u0430\u043d\u0438\u044f jti).
            _logger.LogWarning("Refresh token hash mismatch for jti {Jti}", jti);
            return (RefreshValidationResult.NotFound, Guid.Empty);
        }

        if (record.RevokedAt is not null)
        {
            // \u0420\u0435\u0432\u044c\u044e \u0440\u0430\u043d\u0435\u0435 revoked \u0442\u043e\u043a\u0435\u043d\u0430 \u2014 \u043a\u043b\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043f\u0440\u0438\u0437\u043d\u0430\u043a \u043a\u0440\u0430\u0436\u0438.
            // \u041e\u0442\u0437\u044b\u0432\u0430\u0435\u043c \u0432\u0441\u044e family.
            _logger.LogWarning("Refresh reuse detected. Family {FamilyId} revoked.", record.FamilyId);
            await RevokeFamilyAsync(record.FamilyId, "reuse_detected", ct);
            return (RefreshValidationResult.ReuseDetected, record.FamilyId);
        }

        if (record.ExpiresAt <= DateTime.UtcNow)
            return (RefreshValidationResult.Expired, record.FamilyId);

        return (RefreshValidationResult.Valid, record.FamilyId);
    }

    public async Task MarkRotatedAsync(Guid oldJti, Guid newJti, CancellationToken ct = default)
    {
        var record = await _db.RefreshTokens.FirstOrDefaultAsync(x => x.Id == oldJti, ct);
        if (record is null) return;

        record.RevokedAt = DateTime.UtcNow;
        record.RevokedReason = "rotated";
        record.ReplacedByJti = newJti;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeAsync(Guid jti, string reason, CancellationToken ct = default)
    {
        var record = await _db.RefreshTokens.FirstOrDefaultAsync(x => x.Id == jti, ct);
        if (record is null || record.RevokedAt is not null) return;

        record.RevokedAt = DateTime.UtcNow;
        record.RevokedReason = reason;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeFamilyAsync(Guid familyId, string reason, CancellationToken ct = default)
    {
        var records = await _db.RefreshTokens
            .Where(x => x.FamilyId == familyId && x.RevokedAt == null)
            .ToListAsync(ct);
        if (records.Count == 0) return;

        var now = DateTime.UtcNow;
        foreach (var r in records)
        {
            r.RevokedAt = now;
            r.RevokedReason = reason;
        }
        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeAllForUserAsync(Guid userId, string reason, CancellationToken ct = default)
    {
        var records = await _db.RefreshTokens
            .Where(x => x.UserId == userId && x.RevokedAt == null)
            .ToListAsync(ct);
        if (records.Count == 0) return;

        var now = DateTime.UtcNow;
        foreach (var r in records)
        {
            r.RevokedAt = now;
            r.RevokedReason = reason;
        }
        await _db.SaveChangesAsync(ct);
    }
}
