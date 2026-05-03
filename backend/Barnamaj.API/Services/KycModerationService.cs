using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Kyc;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

/// <summary>
/// Сервис модерации KYC-документов.
/// Доступ — только для UserRole.Moderator / Admin.
/// </summary>
public interface IKycModerationService
{
    Task<IReadOnlyList<PendingDocumentDto>> ListPendingAsync(int limit, CancellationToken ct);
    Task ApproveAsync(Guid documentId, Guid moderatorId, HttpContext http, CancellationToken ct);
    Task RejectAsync(Guid documentId, Guid moderatorId, string reason, HttpContext http, CancellationToken ct);
}

public sealed class KycModerationService : IKycModerationService
{
    private static readonly TimeSpan PresignedTtl = TimeSpan.FromMinutes(5);

    private readonly AppDbContext     _db;
    private readonly IDocumentStorage _storage;
    private readonly ILogger<KycModerationService> _logger;

    public KycModerationService(AppDbContext db, IDocumentStorage storage,
        ILogger<KycModerationService> logger)
    {
        _db      = db;
        _storage = storage;
        _logger  = logger;
    }

    public async Task<IReadOnlyList<PendingDocumentDto>> ListPendingAsync(int limit, CancellationToken ct)
    {
        if (limit <= 0 || limit > 100) limit = 50;

        var docs = await _db.UserDocuments
            .AsNoTracking()
            .Where(d => d.Status == DocumentStatus.Pending || d.Status == DocumentStatus.InReview)
            .OrderBy(d => d.CreatedAt)
            .Take(limit)
            .Select(d => new
            {
                d.Id, d.UserId, UserEmail = d.User.Email,
                d.DocumentType, d.Status, d.FrontObjectKey, d.BackObjectKey,
                d.SelfieObjectKey, d.CreatedAt
            })
            .ToListAsync(ct);

        var result = new List<PendingDocumentDto>(docs.Count);
        foreach (var d in docs)
        {
            result.Add(new PendingDocumentDto(
                Id:           d.Id,
                UserId:       d.UserId,
                UserEmail:    d.UserEmail,
                DocumentType: d.DocumentType.ToString(),
                Status:       d.Status.ToString(),
                FrontUrl:     await _storage.GetPresignedUrlAsync(d.FrontObjectKey,    PresignedTtl, ct),
                BackUrl:      d.BackObjectKey is null ? null
                              : await _storage.GetPresignedUrlAsync(d.BackObjectKey,  PresignedTtl, ct),
                SelfieUrl:    await _storage.GetPresignedUrlAsync(d.SelfieObjectKey,  PresignedTtl, ct),
                CreatedAt:    d.CreatedAt));
        }
        return result;
    }

    public async Task ApproveAsync(Guid documentId, Guid moderatorId, HttpContext http, CancellationToken ct)
    {
        var doc = await _db.UserDocuments
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == documentId, ct)
            ?? throw new KycException("not_found", "Документ не найден.");

        if (doc.Status != DocumentStatus.Pending && doc.Status != DocumentStatus.InReview)
            throw new KycException("invalid_state", "Этот документ уже обработан.");

        doc.Status            = DocumentStatus.Approved;
        doc.ReviewedByUserId  = moderatorId;
        doc.ReviewedAt        = DateTime.UtcNow;

        doc.User.KycStatus     = KycStatus.Full;
        doc.User.KycVerifiedAt = DateTime.UtcNow;

        _db.KycEvents.Add(new KycEvent
        {
            UserId      = doc.UserId,
            EventType   = "doc_approved",
            Provider    = "moderator",
            ProviderRef = moderatorId.ToString(),
            PayloadJson = $"{{\"docId\":\"{doc.Id}\"}}",
            IpAddress   = http.Connection.RemoteIpAddress?.ToString(),
            UserAgent   = http.Request.Headers.UserAgent.ToString(),
        });
        _db.KycEvents.Add(new KycEvent
        {
            UserId      = doc.UserId,
            EventType   = "kyc_full",
            Provider    = "system",
            IpAddress   = http.Connection.RemoteIpAddress?.ToString(),
        });

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("KYC: doc {DocId} approved by mod {ModId} → user {UserId} = Full",
            doc.Id, moderatorId, doc.UserId);
    }

    public async Task RejectAsync(Guid documentId, Guid moderatorId, string reason, HttpContext http, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Length is < 5 or > 500)
            throw new KycException("invalid_reason", "Причина отклонения: 5–500 символов.");

        var doc = await _db.UserDocuments
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == documentId, ct)
            ?? throw new KycException("not_found", "Документ не найден.");

        if (doc.Status != DocumentStatus.Pending && doc.Status != DocumentStatus.InReview)
            throw new KycException("invalid_state", "Этот документ уже обработан.");

        doc.Status           = DocumentStatus.Rejected;
        doc.ReviewedByUserId = moderatorId;
        doc.ReviewedAt       = DateTime.UtcNow;
        doc.RejectionReason  = reason;

        doc.User.KycStatus = KycStatus.Rejected;

        _db.KycEvents.Add(new KycEvent
        {
            UserId      = doc.UserId,
            EventType   = "doc_rejected",
            Provider    = "moderator",
            ProviderRef = moderatorId.ToString(),
            PayloadJson = $"{{\"docId\":\"{doc.Id}\"}}",
            IpAddress   = http.Connection.RemoteIpAddress?.ToString(),
            UserAgent   = http.Request.Headers.UserAgent.ToString(),
        });

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("KYC: doc {DocId} rejected by mod {ModId}", doc.Id, moderatorId);
    }
}
