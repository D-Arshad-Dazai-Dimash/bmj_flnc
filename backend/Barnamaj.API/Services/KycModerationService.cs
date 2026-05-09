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

    // ── Submissions (новый pattern: атомарные заявки Individual / Legal) ──
    Task<IReadOnlyList<PendingSubmissionDto>> ListPendingSubmissionsAsync(
        KycSubmissionKind? kind, int limit, CancellationToken ct);
    Task ApproveSubmissionAsync(Guid submissionId, Guid moderatorId, HttpContext http, CancellationToken ct);
    Task RejectSubmissionAsync(Guid submissionId, Guid moderatorId, string reason, HttpContext http, CancellationToken ct);
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

    // ════════════════════════════════════════════════════════════════════
    // SUBMISSIONS — атомарные KYC-заявки (Individual / Legal)
    // ════════════════════════════════════════════════════════════════════

    public async Task<IReadOnlyList<PendingSubmissionDto>> ListPendingSubmissionsAsync(
        KycSubmissionKind? kind, int limit, CancellationToken ct)
    {
        if (limit <= 0 || limit > 100) limit = 50;

        var query = _db.KycSubmissions
            .AsNoTracking()
            .Include(s => s.User)
            .Include(s => s.Documents)
            .Where(s => s.Status == KycSubmissionStatus.Pending
                     || s.Status == KycSubmissionStatus.AiApproved
                     || s.Status == KycSubmissionStatus.ManualReview);

        if (kind.HasValue)
            query = query.Where(s => s.Kind == kind.Value);

        var rows = await query
            .OrderBy(s => s.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        var result = new List<PendingSubmissionDto>(rows.Count);
        foreach (var s in rows)
        {
            var docs = new List<SubmissionDocumentDto>(s.Documents.Count);
            foreach (var d in s.Documents)
            {
                docs.Add(new SubmissionDocumentDto(
                    Id:           d.Id,
                    DocumentType: d.DocumentType.ToString(),
                    FrontUrl:     await _storage.GetPresignedUrlAsync(d.FrontObjectKey,  PresignedTtl, ct),
                    BackUrl:      d.BackObjectKey is null ? null
                                  : await _storage.GetPresignedUrlAsync(d.BackObjectKey, PresignedTtl, ct),
                    SelfieUrl:    await _storage.GetPresignedUrlAsync(d.SelfieObjectKey, PresignedTtl, ct)));
            }

            result.Add(new PendingSubmissionDto(
                Id:              s.Id,
                UserId:          s.UserId,
                UserEmail:       s.User.Email,
                Kind:            s.Kind.ToString(),
                Status:          s.Status.ToString(),
                LegalForm:       s.LegalForm,
                Bin:             s.Bin,
                LegalName:       s.LegalName,
                LegalAddress:    s.LegalAddress,
                ContactPhone:    s.ContactPhone,
                ResponsibleRole: s.ResponsibleRole?.ToString(),
                ResponsibleName: s.ResponsibleName,
                AiDecision:      s.AiDecision,
                AiConfidence:    s.AiConfidence,
                AiReasoning:     s.AiReasoning,
                CreatedAt:       s.CreatedAt,
                Documents:       docs));
        }
        return result;
    }

    public async Task ApproveSubmissionAsync(Guid submissionId, Guid moderatorId, HttpContext http, CancellationToken ct)
    {
        var s = await _db.KycSubmissions
            .Include(x => x.User)
            .Include(x => x.Documents)
            .FirstOrDefaultAsync(x => x.Id == submissionId, ct)
            ?? throw new KycException("not_found", "Заявка не найдена.");

        if (s.Status is KycSubmissionStatus.Approved or KycSubmissionStatus.Rejected)
            throw new KycException("invalid_state", "Эта заявка уже обработана.");

        s.Status           = KycSubmissionStatus.Approved;
        s.ReviewedByUserId = moderatorId;
        s.ReviewedAt       = DateTime.UtcNow;

        foreach (var d in s.Documents)
        {
            if (d.Status is not (DocumentStatus.Approved or DocumentStatus.Rejected))
            {
                d.Status           = DocumentStatus.Approved;
                d.ReviewedByUserId = moderatorId;
                d.ReviewedAt       = DateTime.UtcNow;
            }
        }

        s.User.KycStatus     = KycStatus.Full;
        s.User.KycVerifiedAt = DateTime.UtcNow;

        // Для legal — отметить профиль как verified.
        if (s.Kind == KycSubmissionKind.Legal && s.User.ProfileId is { } profileId)
        {
            var profile = await _db.Profiles.FirstOrDefaultAsync(p => p.Id == profileId, ct);
            if (profile is not null)
            {
                profile.IsVerified = true;
            }
        }

        _db.KycEvents.Add(new KycEvent
        {
            UserId      = s.UserId,
            EventType   = "submission_approved",
            Provider    = "moderator",
            ProviderRef = moderatorId.ToString(),
            PayloadJson = $"{{\"id\":\"{s.Id}\",\"kind\":\"{s.Kind}\"}}",
            IpAddress   = http.Connection.RemoteIpAddress?.ToString(),
            UserAgent   = http.Request.Headers.UserAgent.ToString(),
        });
        _db.KycEvents.Add(new KycEvent
        {
            UserId    = s.UserId,
            EventType = "kyc_full",
            Provider  = "system",
            IpAddress = http.Connection.RemoteIpAddress?.ToString(),
        });

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("KYC: submission {Id} approved by mod {ModId} ({Kind}) → user {UserId}=Full",
            s.Id, moderatorId, s.Kind, s.UserId);
    }

    public async Task RejectSubmissionAsync(Guid submissionId, Guid moderatorId, string reason, HttpContext http, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Length is < 5 or > 500)
            throw new KycException("invalid_reason", "Причина отклонения: 5–500 символов.");

        var s = await _db.KycSubmissions
            .Include(x => x.User)
            .Include(x => x.Documents)
            .FirstOrDefaultAsync(x => x.Id == submissionId, ct)
            ?? throw new KycException("not_found", "Заявка не найдена.");

        if (s.Status is KycSubmissionStatus.Approved or KycSubmissionStatus.Rejected)
            throw new KycException("invalid_state", "Эта заявка уже обработана.");

        s.Status           = KycSubmissionStatus.Rejected;
        s.ReviewedByUserId = moderatorId;
        s.ReviewedAt       = DateTime.UtcNow;
        s.RejectionReason  = reason;

        foreach (var d in s.Documents)
        {
            if (d.Status is not (DocumentStatus.Approved or DocumentStatus.Rejected))
            {
                d.Status           = DocumentStatus.Rejected;
                d.ReviewedByUserId = moderatorId;
                d.ReviewedAt       = DateTime.UtcNow;
                d.RejectionReason  = reason;
            }
        }

        s.User.KycStatus = KycStatus.Rejected;

        _db.KycEvents.Add(new KycEvent
        {
            UserId      = s.UserId,
            EventType   = "submission_rejected",
            Provider    = "moderator",
            ProviderRef = moderatorId.ToString(),
            PayloadJson = $"{{\"id\":\"{s.Id}\",\"kind\":\"{s.Kind}\"}}",
            IpAddress   = http.Connection.RemoteIpAddress?.ToString(),
            UserAgent   = http.Request.Headers.UserAgent.ToString(),
        });

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("KYC: submission {Id} rejected by mod {ModId}: {Reason}",
            s.Id, moderatorId, reason);
    }
}
