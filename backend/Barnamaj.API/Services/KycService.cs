using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Kyc;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

/// <summary>
/// Машина состояний KYC (рынок РК).
///
/// Переходы:
///   None → Lite                 (phone verified + IIN set)
///   Lite → DocPending           (документ загружен)
///   DocPending → Full           (модератор одобрил)
///   DocPending → Rejected       (модератор отклонил)
///   Rejected → DocPending       (повторная загрузка)
///
/// Все операции пишут аудит-журнал KycEvent (без PII в payload).
/// </summary>
public interface IKycService
{
    Task<string>       SendPhoneCodeAsync(Guid userId, string phone, HttpContext http, CancellationToken ct);
    Task               VerifyPhoneAsync(Guid userId, string phone, string code, HttpContext http, CancellationToken ct);
    Task               SetIinAsync(Guid userId, string iin, HttpContext http, CancellationToken ct);
    Task<UserDocument> UploadDocumentAsync(Guid userId, DocumentType docType,
        IFormFile front, IFormFile? back, IFormFile selfie, HttpContext http, CancellationToken ct);
    Task<KycStatusDto> GetStatusAsync(Guid userId, CancellationToken ct);
}

public sealed class KycException : Exception
{
    public string Code { get; }
    public KycException(string code, string message) : base(message) => Code = code;
}

public sealed class KycService : IKycService
{
    private static readonly Regex KzPhoneRegex = new(@"^\+7[0-9]{10}$", RegexOptions.Compiled);

    private readonly AppDbContext     _db;
    private readonly IOtpService      _otp;
    private readonly ISmsProvider     _sms;
    private readonly IIinProtector    _iinProtector;
    private readonly IFileValidator   _fileValidator;
    private readonly IDocumentStorage _storage;
    private readonly ILogger<KycService> _logger;

    public KycService(
        AppDbContext db,
        IOtpService otp,
        ISmsProvider sms,
        IIinProtector iinProtector,
        IFileValidator fileValidator,
        IDocumentStorage storage,
        ILogger<KycService> logger)
    {
        _db            = db;
        _otp           = otp;
        _sms           = sms;
        _iinProtector  = iinProtector;
        _fileValidator = fileValidator;
        _storage       = storage;
        _logger        = logger;
    }

    // ── Phone ─────────────────────────────────────────────────────────

    public async Task<string> SendPhoneCodeAsync(Guid userId, string phone, HttpContext http, CancellationToken ct)
    {
        ValidatePhone(phone);

        // Не позволяем перепривязывать к чужому верифицированному номеру
        var conflict = await _db.Users.AnyAsync(
            u => u.Id != userId && u.Phone == phone && u.IsPhoneVerified, ct);
        if (conflict)
            throw new KycException("phone_in_use", "Этот номер уже привязан к другому аккаунту.");

        string code;
        try
        {
            code = await _otp.IssueAsync($"phone:{phone}", ct);
        }
        catch (OtpThrottleException ex)
        {
            throw new KycException("rate_limited", ex.Message);
        }

        await _sms.SendAsync(phone, $"Barnamaj: код подтверждения {code}. Никому не сообщайте.", ct);

        await WriteEventAsync(userId, "phone_code_sent", http, ct: ct);
        await _db.SaveChangesAsync(ct);
        return "ok";
    }

    public async Task VerifyPhoneAsync(Guid userId, string phone, string code, HttpContext http, CancellationToken ct)
    {
        ValidatePhone(phone);

        var ok = await _otp.VerifyAsync($"phone:{phone}", code, ct);
        if (!ok) throw new KycException("invalid_code", "Неверный код. Запросите новый.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KycException("user_not_found", "Пользователь не найден.");

        user.Phone           = phone;
        user.IsPhoneVerified = true;

        await TryPromoteToLiteAsync(user, ct);
        await WriteEventAsync(userId, "phone_verified", http, ct: ct);
        await _db.SaveChangesAsync(ct);
    }

    private static void ValidatePhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone) || !KzPhoneRegex.IsMatch(phone))
            throw new KycException("invalid_phone", "Телефон должен быть в формате +7XXXXXXXXXX (Казахстан).");
    }

    // ── ИИН ───────────────────────────────────────────────────────────

    public async Task SetIinAsync(Guid userId, string iin, HttpContext http, CancellationToken ct)
    {
        if (!IinValidator.IsValid(iin))
            throw new KycException("invalid_iin", "ИИН не прошёл проверку контрольной суммы.");

        var hmac = _iinProtector.ComputeHmac(iin);

        // Уникальность ИИН среди активных аккаунтов
        var conflict = await _db.Users.AnyAsync(
            u => u.Id != userId && u.IinHmac == hmac, ct);
        if (conflict)
            throw new KycException("iin_in_use", "Этот ИИН уже используется другим аккаунтом.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KycException("user_not_found", "Пользователь не найден.");

        user.IinHmac      = hmac;
        user.IinEncrypted = _iinProtector.Encrypt(iin);

        await TryPromoteToLiteAsync(user, ct);
        await WriteEventAsync(userId, "iin_set", http, ct: ct);
        await _db.SaveChangesAsync(ct);
    }

    private Task TryPromoteToLiteAsync(User user, CancellationToken ct)
    {
        if (user.KycStatus == KycStatus.None
            && user.IsPhoneVerified
            && !string.IsNullOrEmpty(user.IinHmac))
        {
            user.KycStatus = KycStatus.Lite;
            _logger.LogInformation("KYC: user {UserId} promoted to Lite", user.Id);
        }
        return Task.CompletedTask;
    }

    // ── Документ ──────────────────────────────────────────────────────

    public async Task<UserDocument> UploadDocumentAsync(Guid userId, DocumentType docType,
        IFormFile front, IFormFile? back, IFormFile selfie, HttpContext http, CancellationToken ct)
    {
        var user = await _db.Users
            .Include(u => u.Documents)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KycException("user_not_found", "Пользователь не найден.");

        if (user.KycStatus is not (KycStatus.Lite or KycStatus.Rejected))
            throw new KycException("invalid_state",
                "Загрузка документа доступна после подтверждения телефона и ИИН.");

        if (docType == DocumentType.NationalId && back is null)
            throw new KycException("back_required",
                "Для удостоверения личности РК требуется задняя сторона.");

        // Валидация файлов: magic bytes + размер
        var frontExt  = await ValidateFileAsync(front,  ct);
        var selfieExt = await ValidateFileAsync(selfie, ct);
        var backExt   = back is null ? null : await ValidateFileAsync(back, ct);

        // Хеш переднего файла (детект дубликатов)
        var sha256 = await ComputeSha256Async(front, ct);

        var dupOwner = await _db.UserDocuments
            .Where(d => d.FrontSha256 == sha256
                     && d.UserId != userId
                     && d.Status != DocumentStatus.Rejected)
            .Select(d => d.UserId)
            .FirstOrDefaultAsync(ct);
        if (dupOwner != Guid.Empty)
            throw new KycException("doc_duplicate",
                "Этот документ уже загружен другим пользователем. " +
                "Если это ошибка — обратитесь в поддержку.");

        // Удаляем предыдущие активные документы (Pending/InReview/Approved)
        // только если они есть и в состоянии не Approved (Approved не удаляем — там Full!)
        var oldActive = user.Documents
            .Where(d => d.Status is DocumentStatus.Pending or DocumentStatus.InReview)
            .ToList();
        foreach (var old in oldActive)
        {
            await SafeDeleteFromStorage(old.FrontObjectKey, ct);
            if (old.BackObjectKey is not null) await SafeDeleteFromStorage(old.BackObjectKey, ct);
            await SafeDeleteFromStorage(old.SelfieObjectKey, ct);
            _db.UserDocuments.Remove(old);
        }

        var docId       = Guid.NewGuid();
        var keyPrefix   = $"kyc/{userId}/{docId}";
        var frontKey    = $"{keyPrefix}_front{frontExt}";
        var selfieKey   = $"{keyPrefix}_selfie{selfieExt}";
        var backKey     = back is null ? null : $"{keyPrefix}_back{backExt}";

        await UploadToStorage(front, frontKey, ct);
        await UploadToStorage(selfie, selfieKey, ct);
        if (back is not null) await UploadToStorage(back, backKey!, ct);

        var doc = new UserDocument
        {
            Id              = docId,
            UserId          = userId,
            DocumentType    = docType,
            Status          = DocumentStatus.Pending,
            FrontObjectKey  = frontKey,
            BackObjectKey   = backKey,
            SelfieObjectKey = selfieKey,
            FrontSha256     = sha256,
        };
        _db.UserDocuments.Add(doc);

        user.KycStatus = KycStatus.DocPending;

        await WriteEventAsync(userId, "doc_uploaded", http, payload: $"{{\"docId\":\"{docId}\"}}", ct: ct);
        await _db.SaveChangesAsync(ct);

        return doc;
    }

    private async Task<string> ValidateFileAsync(IFormFile file, CancellationToken ct)
    {
        try
        {
            await using var s = file.OpenReadStream();
            // Skip-проверка: для ASP.NET FormFile поток обычно не seekable → копируем
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

    private async Task UploadToStorage(IFormFile file, string key, CancellationToken ct)
    {
        await using var src = file.OpenReadStream();
        using var ms = new MemoryStream();
        await src.CopyToAsync(ms, ct);
        ms.Position = 0;
        await _storage.UploadAsync(ms, key, file.ContentType ?? "application/octet-stream", ct);
    }

    private async Task SafeDeleteFromStorage(string key, CancellationToken ct)
    {
        try { await _storage.DeleteAsync(key, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "KYC: failed to delete {Key}", key); }
    }

    // ── Status ────────────────────────────────────────────────────────

    public async Task<KycStatusDto> GetStatusAsync(Guid userId, CancellationToken ct)
    {
        var user = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.KycStatus, u.IsPhoneVerified, u.Phone, u.IinHmac,
                u.IinEncrypted, u.KycVerifiedAt,
                AccountType = u.Profile != null ? u.Profile.AccountType : AccountType.Individual
            })
            .FirstOrDefaultAsync(ct)
            ?? throw new KycException("user_not_found", "Пользователь не найден.");

        var latest = await _db.UserDocuments
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new DocumentSummaryDto(
                d.Id, d.DocumentType.ToString(), d.Status.ToString(),
                d.CreatedAt, d.ReviewedAt, d.RejectionReason))
            .FirstOrDefaultAsync(ct);

        var latestSubmission = await _db.KycSubmissions
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SubmissionSummaryDto(
                s.Id, s.Kind.ToString(), s.Status.ToString(),
                s.AiDecision, s.CreatedAt, s.ReviewedAt, s.RejectionReason))
            .FirstOrDefaultAsync(ct);

        string? iinMasked = null;
        if (!string.IsNullOrEmpty(user.IinEncrypted))
        {
            try
            {
                var iin = _iinProtector.Decrypt(user.IinEncrypted);
                iinMasked = iin.Length == 12 ? $"{iin[..3]}***{iin[8..]}" : "***";
            }
            catch { iinMasked = "***"; }
        }

        return new KycStatusDto(
            Status:           user.KycStatus.ToString(),
            IsPhoneVerified:  user.IsPhoneVerified,
            Phone:            MaskPhone(user.Phone),
            HasIin:           !string.IsNullOrEmpty(user.IinHmac),
            IinMasked:        iinMasked,
            KycVerifiedAt:    user.KycVerifiedAt,
            LatestDocument:   latest,
            LatestSubmission: latestSubmission,
            AccountType:      user.AccountType.ToString());
    }

    private static string? MaskPhone(string? phone)
    {
        if (string.IsNullOrEmpty(phone) || phone.Length < 8) return phone;
        return $"{phone[..5]}***{phone[^2..]}";
    }

    // ── Audit ─────────────────────────────────────────────────────────

    private Task WriteEventAsync(Guid userId, string eventType, HttpContext http,
        string? provider = "system", string? providerRef = null, string? payload = null,
        CancellationToken ct = default)
    {
        _db.KycEvents.Add(new KycEvent
        {
            UserId      = userId,
            EventType   = eventType,
            Provider    = provider,
            ProviderRef = providerRef,
            PayloadJson = payload,
            IpAddress   = http.Connection.RemoteIpAddress?.ToString(),
            UserAgent   = http.Request.Headers.UserAgent.ToString(),
        });
        return Task.CompletedTask;
    }
}
