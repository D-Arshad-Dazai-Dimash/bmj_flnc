using System.Security.Cryptography;
using System.Text.Json;
using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Kyc;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

/// <summary>
/// Сервис подачи KYC-заявок (Individual / Legal). Объединяет:
///   • валидацию и сохранение файлов;
///   • lookup юр. лица по БИН в реестре (statgov stub в v1);
///   • создание <see cref="KycSubmission"/> с снапшотом данных;
///   • запуск <see cref="IKycAiReviewer"/> для авто-проверки.
///
/// Не апрувит сам — финальное решение всегда за модератором (см.
/// <see cref="KycModerationService"/>).
/// </summary>
public interface IKycSubmissionService
{
    /// <summary>
    /// Создаёт Individual-заявку из уже загруженного документа пользователя.
    /// Требует: phone verified, IIN set, последний UserDocument в статусе Pending/Approved.
    /// </summary>
    Task<KycSubmission> SubmitIndividualAsync(Guid userId, HttpContext http, CancellationToken ct);

    /// <summary>
    /// Создаёт Legal-заявку: валидирует поля, сохраняет файлы, делает snapshot
    /// данных из реестра, запускает AI-проверку.
    /// </summary>
    Task<KycSubmission> SubmitLegalAsync(
        Guid userId,
        LegalKycFieldsDto fields,
        IFormFile responsibleIdFront,
        IFormFile responsibleIdSelfie,
        IFormFile? responsibleIdBack,
        IFormFile? authorityDocument,
        IFormFile? companyRegistration,
        HttpContext http,
        CancellationToken ct);

    /// <summary>Public lookup — для автозаполнения формы юр. KYC.</summary>
    Task<LegalEntityLookupDto?> LookupLegalEntityAsync(string bin, CancellationToken ct);
}

public sealed class KycSubmissionService : IKycSubmissionService
{
    private static readonly HashSet<string> AllowedLegalForms =
        new(StringComparer.OrdinalIgnoreCase) { "ТОО", "АО", "ИП" };

    private readonly AppDbContext         _db;
    private readonly IFileValidator       _fileValidator;
    private readonly IDocumentStorage     _storage;
    private readonly ILegalEntityRegistry _registry;
    private readonly IKycAiReviewer       _ai;
    private readonly ILogger<KycSubmissionService> _logger;

    public KycSubmissionService(
        AppDbContext db,
        IFileValidator fileValidator,
        IDocumentStorage storage,
        ILegalEntityRegistry registry,
        IKycAiReviewer ai,
        ILogger<KycSubmissionService> logger)
    {
        _db            = db;
        _fileValidator = fileValidator;
        _storage       = storage;
        _registry      = registry;
        _ai            = ai;
        _logger        = logger;
    }

    // ── Lookup БИН ────────────────────────────────────────────────────

    public async Task<LegalEntityLookupDto?> LookupLegalEntityAsync(string bin, CancellationToken ct)
    {
        var info = await _registry.LookupByBinAsync(bin, ct);
        return info is null ? null : new LegalEntityLookupDto(
            Bin:       info.Bin,
            LegalForm: info.LegalForm,
            Name:      info.Name,
            Address:   info.Address,
            Director:  info.Director,
            IsActive:  info.IsActive,
            Source:    info.Source);
    }

    // ── Individual ────────────────────────────────────────────────────

    public async Task<KycSubmission> SubmitIndividualAsync(Guid userId, HttpContext http, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KycException("user_not_found", "Пользователь не найден.");

        if (!user.IsPhoneVerified || string.IsNullOrEmpty(user.IinHmac))
            throw new KycException("invalid_state", "Сначала подтвердите телефон и ИИН.");

        // Берём последний загруженный документ (Pending или Approved).
        var doc = await _db.UserDocuments
            .Where(d => d.UserId == userId && d.Status != DocumentStatus.Rejected)
            .OrderByDescending(d => d.CreatedAt)
            .FirstOrDefaultAsync(ct)
            ?? throw new KycException("no_document", "Сначала загрузите удостоверяющий документ.");

        await EnsureNoActiveSubmissionAsync(userId, ct);

        var submission = new KycSubmission
        {
            UserId = userId,
            Kind   = KycSubmissionKind.Individual,
            Status = KycSubmissionStatus.Pending,
        };
        submission.Documents.Add(doc);
        doc.SubmissionId = submission.Id;

        _db.KycSubmissions.Add(submission);

        await ApplyAiReviewAsync(submission, ct);
        await WriteEventAsync(userId, "submission_individual_created", http, payload: $"{{\"id\":\"{submission.Id}\"}}", ct: ct);

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("KYC: Individual submission {Id} for user {UserId} → {Status} ({AiDecision})",
            submission.Id, userId, submission.Status, submission.AiDecision);
        return submission;
    }

    // ── Legal ─────────────────────────────────────────────────────────

    public async Task<KycSubmission> SubmitLegalAsync(
        Guid userId,
        LegalKycFieldsDto fields,
        IFormFile responsibleIdFront,
        IFormFile responsibleIdSelfie,
        IFormFile? responsibleIdBack,
        IFormFile? authorityDocument,
        IFormFile? companyRegistration,
        HttpContext http,
        CancellationToken ct)
    {
        // ── 1. Валидация полей ──
        ValidateLegalFields(fields);

        if (!Enum.TryParse<ResponsibleRole>(fields.ResponsibleRole, ignoreCase: true, out var role))
            throw new KycException("invalid_role", "Недопустимая роль ответственного лица.");

        // Для НЕ-ИП-Owner документ-основание обязателен.
        var needsAuthority = !(string.Equals(fields.LegalForm, "ИП", StringComparison.OrdinalIgnoreCase)
                                && role == ResponsibleRole.Owner);
        if (needsAuthority && authorityDocument is null)
            throw new KycException("missing_authority",
                "Для выбранной формы и роли требуется документ-основание полномочий.");

        if (responsibleIdFront is null || responsibleIdSelfie is null)
            throw new KycException("missing_files",
                "Удостоверение личности ответственного лица и селфи обязательны.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KycException("user_not_found", "Пользователь не найден.");

        await EnsureNoActiveSubmissionAsync(userId, ct);

        // ── 2. Реестровый snapshot ──
        var registry = await _registry.LookupByBinAsync(fields.Bin, ct);
        var snapshotJson = registry is null ? null
            : JsonSerializer.Serialize(registry);

        // ── 3. Создаём submission (без документов сначала, получим Id) ──
        var submission = new KycSubmission
        {
            UserId               = userId,
            Kind                 = KycSubmissionKind.Legal,
            Status               = KycSubmissionStatus.Pending,
            LegalForm            = fields.LegalForm.Trim(),
            Bin                  = fields.Bin.Trim(),
            LegalName            = fields.LegalName.Trim(),
            LegalAddress         = string.IsNullOrWhiteSpace(fields.LegalAddress) ? null : fields.LegalAddress.Trim(),
            ContactPhone         = string.IsNullOrWhiteSpace(fields.ContactPhone) ? null : fields.ContactPhone.Trim(),
            ResponsibleRole      = role,
            ResponsibleName      = fields.ResponsibleName.Trim(),
            RegistrySnapshotJson = snapshotJson,
        };
        _db.KycSubmissions.Add(submission);

        // ── 4. Сохранение файлов ──
        var keyPrefix = $"kyc/{userId}/legal/{submission.Id}";

        await SaveDocumentAsync(submission, DocumentType.ResponsiblePersonId,
            front: responsibleIdFront, back: responsibleIdBack, selfie: responsibleIdSelfie,
            keyPrefix: keyPrefix, ct: ct);

        if (authorityDocument is not null)
        {
            await SaveDocumentAsync(submission, DocumentType.AuthorityDocument,
                front: authorityDocument, back: null, selfie: responsibleIdSelfie,
                keyPrefix: keyPrefix, ct: ct);
        }

        if (companyRegistration is not null)
        {
            await SaveDocumentAsync(submission, DocumentType.CompanyRegistration,
                front: companyRegistration, back: null, selfie: responsibleIdSelfie,
                keyPrefix: keyPrefix, ct: ct);
        }

        // ── 5. Обновляем профиль (черновые legal-поля, не подтверждены) ──
        if (user.ProfileId is { } profileId)
        {
            var profile = await _db.Profiles.FirstOrDefaultAsync(p => p.Id == profileId, ct);
            if (profile is not null)
            {
                profile.AccountType  = AccountType.Company;
                profile.LegalForm    = submission.LegalForm;
                profile.Bin          = submission.Bin;
                profile.LegalName    = submission.LegalName;
                profile.LegalAddress = submission.LegalAddress;
                profile.ContactPhone = submission.ContactPhone;
                profile.DirectorName = submission.ResponsibleRole == ResponsibleRole.Director
                    ? submission.ResponsibleName : profile.DirectorName;
            }
        }

        // ── 6. AI-проверка ──
        await ApplyAiReviewAsync(submission, ct);

        // Если AI отклонил → юзер сразу видит причину, KycStatus → Rejected.
        if (submission.Status == KycSubmissionStatus.AiRejected)
        {
            user.KycStatus = KycStatus.Rejected;
        }
        else
        {
            user.KycStatus = KycStatus.DocPending;
        }

        await WriteEventAsync(userId, "submission_legal_created", http,
            payload: $"{{\"id\":\"{submission.Id}\",\"bin\":\"{submission.Bin}\"}}", ct: ct);

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("KYC: Legal submission {Id} for user {UserId} → {Status} ({AiDecision})",
            submission.Id, userId, submission.Status, submission.AiDecision);
        return submission;
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private static void ValidateLegalFields(LegalKycFieldsDto f)
    {
        if (f is null) throw new KycException("invalid_request", "Пустой запрос.");

        if (string.IsNullOrWhiteSpace(f.LegalForm) || !AllowedLegalForms.Contains(f.LegalForm))
            throw new KycException("invalid_legal_form",
                "Поддерживаемые формы: ТОО, АО, ИП.");

        if (string.IsNullOrWhiteSpace(f.Bin) || f.Bin.Length != 12 || !f.Bin.All(char.IsDigit))
            throw new KycException("invalid_bin", "БИН должен быть из 12 цифр.");

        if (string.IsNullOrWhiteSpace(f.LegalName) || f.LegalName.Trim().Length is < 3 or > 256)
            throw new KycException("invalid_name", "Наименование: 3–256 символов.");

        if (string.IsNullOrWhiteSpace(f.ResponsibleName) || f.ResponsibleName.Trim().Length is < 3 or > 256)
            throw new KycException("invalid_responsible", "ФИО ответственного лица: 3–256 символов.");

        if (f.LegalAddress is { Length: > 512 })
            throw new KycException("invalid_address", "Адрес слишком длинный.");
    }

    private async Task EnsureNoActiveSubmissionAsync(Guid userId, CancellationToken ct)
    {
        var hasActive = await _db.KycSubmissions.AnyAsync(s =>
            s.UserId == userId &&
            (s.Status == KycSubmissionStatus.Pending
             || s.Status == KycSubmissionStatus.AiApproved
             || s.Status == KycSubmissionStatus.ManualReview), ct);

        if (hasActive)
            throw new KycException("active_submission_exists",
                "У вас уже есть активная заявка на проверке. Дождитесь решения модератора.");
    }

    private async Task ApplyAiReviewAsync(KycSubmission submission, CancellationToken ct)
    {
        var ai = await _ai.ReviewAsync(submission, ct);
        submission.AiDecision   = ai.Decision;
        submission.AiConfidence = ai.Confidence;
        submission.AiReasoning  = ai.Reasoning;

        submission.Status = ai.Decision switch
        {
            "reject" => KycSubmissionStatus.AiRejected,
            "manual" => KycSubmissionStatus.ManualReview,
            // "approve" в v1 не auto-applies — отправляем модератору.
            _        => KycSubmissionStatus.ManualReview,
        };

        if (submission.Status == KycSubmissionStatus.AiRejected)
        {
            submission.RejectionReason = ai.Reasoning;
            submission.ReviewedAt      = DateTime.UtcNow;
        }
    }

    private async Task SaveDocumentAsync(
        KycSubmission submission,
        DocumentType type,
        IFormFile front,
        IFormFile? back,
        IFormFile selfie,
        string keyPrefix,
        CancellationToken ct)
    {
        var frontExt  = await ValidateFileAsync(front, ct);
        var selfieExt = await ValidateFileAsync(selfie, ct);
        var backExt   = back is null ? null : await ValidateFileAsync(back, ct);

        var sha256  = await ComputeSha256Async(front, ct);
        var docId   = Guid.NewGuid();
        var sub     = $"{(int)type}_{docId}";
        var fKey    = $"{keyPrefix}_{sub}_front{frontExt}";
        var sKey    = $"{keyPrefix}_{sub}_selfie{selfieExt}";
        var bKey    = back is null ? null : $"{keyPrefix}_{sub}_back{backExt}";

        await UploadAsync(front, fKey, ct);
        await UploadAsync(selfie, sKey, ct);
        if (back is not null) await UploadAsync(back, bKey!, ct);

        var doc = new UserDocument
        {
            Id              = docId,
            UserId          = submission.UserId,
            SubmissionId    = submission.Id,
            DocumentType    = type,
            Status          = DocumentStatus.Pending,
            FrontObjectKey  = fKey,
            BackObjectKey   = bKey,
            SelfieObjectKey = sKey,
            FrontSha256     = sha256,
        };
        _db.UserDocuments.Add(doc);
        submission.Documents.Add(doc);
    }

    private async Task<string> ValidateFileAsync(IFormFile file, CancellationToken ct)
    {
        try
        {
            await using var s = file.OpenReadStream();
            using var ms = new MemoryStream();
            await s.CopyToAsync(ms, ct);
            ms.Position = 0;
            return await _fileValidator.ValidateAsync(ms, file.Length, ct);
        }
        catch (InvalidFileException ex)
        {
            throw new KycException("invalid_file", ex.Message);
        }
    }

    private static async Task<string> ComputeSha256Async(IFormFile file, CancellationToken ct)
    {
        await using var s = file.OpenReadStream();
        using var sha = SHA256.Create();
        var hash = await sha.ComputeHashAsync(s, ct);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private async Task UploadAsync(IFormFile file, string key, CancellationToken ct)
    {
        await using var src = file.OpenReadStream();
        using var ms = new MemoryStream();
        await src.CopyToAsync(ms, ct);
        ms.Position = 0;
        await _storage.UploadAsync(ms, key, file.ContentType ?? "application/octet-stream", ct);
    }

    private Task WriteEventAsync(Guid userId, string eventType, HttpContext http,
        string? payload = null, CancellationToken ct = default)
    {
        _db.KycEvents.Add(new KycEvent
        {
            UserId      = userId,
            EventType   = eventType,
            Provider    = "system",
            PayloadJson = payload,
            IpAddress   = http.Connection.RemoteIpAddress?.ToString(),
            UserAgent   = http.Request.Headers.UserAgent.ToString(),
        });
        return Task.CompletedTask;
    }
}
