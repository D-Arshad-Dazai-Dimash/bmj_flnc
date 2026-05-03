using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Auth;
using Barnamaj.API.Entities;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Подтверждение личности пользователя (KYC) и телефона.
///
/// Маршруты:
///   POST /api/kyc/phone/send-code   — отправить SMS-код
///   POST /api/kyc/phone/verify      — подтвердить телефон (KycStatus → Lite после ИИН)
///   POST /api/kyc/iin               — задать/обновить ИИН (валидация контрольной цифры)
///   GET  /api/kyc/status            — текущий статус KYC пользователя
///
/// Sumsub-эндпоинты добавляются в Фазе 3.
/// </summary>
[ApiController]
[Route("api/kyc")]
[Produces("application/json")]
public sealed class KycController : ControllerBase
{
    private readonly AppDbContext  _db;
    private readonly IKycService   _kyc;
    private readonly IOtpService   _otp;
    private readonly ISmsProvider  _sms;
    private readonly IConfiguration _config;
    private readonly ILogger<KycController> _logger;

    public KycController(
        AppDbContext db, IKycService kyc, IOtpService otp,
        ISmsProvider sms, IConfiguration config, ILogger<KycController> logger)
    {
        _db = db; _kyc = kyc; _otp = otp; _sms = sms; _config = config; _logger = logger;
    }

    private Guid CurrentUserId() =>
        Guid.Parse(User.FindFirst("sub")?.Value
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    // ── SMS OTP ──────────────────────────────────────────────────────────

    [HttpPost("phone/send-code")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SendCode([FromBody] SendPhoneCodeDto dto, CancellationToken ct)
    {
        var userId = CurrentUserId();
        try
        {
            var code = await _otp.IssueAsync(dto.Phone, ct);
            await _sms.SendAsync(dto.Phone, $"Barnamaj: ваш код — {code}. Действителен 5 минут.", ct);
            await _kyc.LogAsync(userId, "phone_send", payload: new { dto.Phone }, ct: ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { error = ex.Message });
        }
    }

    [HttpPost("phone/verify")]
    [Authorize]
    [ProducesResponseType(typeof(KycStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyPhone([FromBody] VerifyPhoneDto dto, CancellationToken ct)
    {
        var userId = CurrentUserId();
        var ok = await _otp.VerifyAsync(dto.Phone, dto.Code, ct);
        if (!ok)
        {
            await _kyc.LogAsync(userId, "phone_invalid", payload: new { dto.Phone }, ct: ct);
            return BadRequest(new { error = "Неверный или истёкший код." });
        }

        await _db.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.Phone,           dto.Phone)
                .SetProperty(u => u.IsPhoneVerified, true), ct);

        await _kyc.LogAsync(userId, "phone_verified", payload: new { dto.Phone }, ct: ct);
        await TryPromoteToLite(userId, ct);
        return Ok(await BuildStatusAsync(userId, ct));
    }

    // ── ИИН ──────────────────────────────────────────────────────────────

    [HttpPost("iin")]
    [Authorize]
    [ProducesResponseType(typeof(KycStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SetIin([FromBody] SetIinDto dto, CancellationToken ct)
    {
        var userId = CurrentUserId();

        if (!IinValidator.IsValid(dto.Iin))
        {
            await _kyc.LogAsync(userId, "iin_invalid", provider: "local", ct: ct);
            return BadRequest(new { error = "Неверная контрольная цифра ИИН." });
        }

        // Уникальность
        var taken = await _db.Users.AnyAsync(u => u.Iin == dto.Iin && u.Id != userId, ct);
        if (taken)
            return Conflict(new { error = "Этот ИИН уже привязан к другому аккаунту." });

        await _db.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.Iin, dto.Iin), ct);

        await _kyc.LogAsync(userId, "iin_set",        provider: "local", ct: ct);
        await _kyc.LogAsync(userId, "consent_given",  provider: "local",
                            payload: new { scope = "personal_data" }, ct: ct);

        await TryPromoteToLite(userId, ct);
        return Ok(await BuildStatusAsync(userId, ct));
    }

    // ── Статус ───────────────────────────────────────────────────────────

    [HttpGet("status")]
    [Authorize]
    [ProducesResponseType(typeof(KycStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
        => Ok(await BuildStatusAsync(CurrentUserId(), ct));

    // ── Sumsub (заглушка; реальная интеграция — Неделя 4) ────────────────

    /// <summary>
    /// Инициировать KYC Full через Sumsub.
    /// Возвращает applicantId и accessToken для встраивания виджета.
    /// </summary>
    [HttpPost("sumsub/init")]
    [Authorize]
    [ProducesResponseType(typeof(SumsubInitResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> SumsubInit(CancellationToken ct)
    {
        var userId      = CurrentUserId();
        var applicantId = $"stub-{userId:N}";
        var accessToken = $"stub-token-{Guid.NewGuid():N}";

        await _kyc.LogAsync(userId, "sumsub_init", provider: "sumsub",
                            providerRef: applicantId, ct: ct);

        // TODO (Неделя 4): реальный вызов Sumsub SDK для получения applicantId/accessToken.
        return Ok(new SumsubInitResponse(applicantId, accessToken));
    }

    /// <summary>
    /// Webhook от Sumsub. Валидируется HMAC-подписью (header x-payload-digest).
    /// applicantId должен начинаться с "stub-{userIdHex}" (или быть привязан к User.KycProviderRef).
    /// Поддерживаются типы: applicantReviewed (reviewResult.reviewAnswer = GREEN | RED).
    /// </summary>
    [HttpPost("sumsub/webhook")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SumsubWebhook(CancellationToken ct)
    {
        // Читаем тело как строку (для подписи)
        Request.EnableBuffering();
        using var reader = new StreamReader(Request.Body, leaveOpen: true);
        var body = await reader.ReadToEndAsync(ct);
        Request.Body.Position = 0;

        var secret = _config["Sumsub:WebhookSecret"];
        if (!string.IsNullOrEmpty(secret))
        {
            var providedSig = Request.Headers["x-payload-digest"].FirstOrDefault();
            using var hmac  = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var expected   = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
            if (providedSig is null ||
                !CryptographicOperations.FixedTimeEquals(
                    Encoding.ASCII.GetBytes(providedSig.ToLowerInvariant()),
                    Encoding.ASCII.GetBytes(expected)))
            {
                _logger.LogWarning("Sumsub webhook: HMAC mismatch");
                return Unauthorized();
            }
        }

        SumsubWebhookPayload? payload;
        try { payload = System.Text.Json.JsonSerializer.Deserialize<SumsubWebhookPayload>(body,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }); }
        catch { return BadRequest(); }
        if (payload is null) return BadRequest();

        // Восстанавливаем userId из applicantId "stub-{hex}" или ищем по KycProviderRef.
        Guid userId = Guid.Empty;
        if (payload.ApplicantId.StartsWith("stub-"))
            Guid.TryParseExact(payload.ApplicantId[5..], "N", out userId);

        if (userId == Guid.Empty)
        {
            var match = await _db.Users
                .Where(u => u.KycProviderRef == payload.ApplicantId)
                .Select(u => (Guid?)u.Id)
                .FirstOrDefaultAsync(ct);
            if (match is null)
            {
                _logger.LogWarning("Sumsub webhook: unknown applicantId {ApplicantId}", payload.ApplicantId);
                return Ok(); // не светим 4xx наружу
            }
            userId = match.Value;
        }

        var answer = payload.ReviewResult?.ReviewAnswer ?? "";
        if (string.Equals(answer, "GREEN", StringComparison.OrdinalIgnoreCase))
        {
            await _kyc.SetStatusAsync(userId, KycStatus.Full, payload.ApplicantId, ct);
            await _kyc.LogAsync(userId, "sumsub_approved", provider: "sumsub",
                                providerRef: payload.ApplicantId, ct: ct);
        }
        else if (string.Equals(answer, "RED", StringComparison.OrdinalIgnoreCase))
        {
            await _kyc.SetStatusAsync(userId, KycStatus.Rejected, payload.ApplicantId, ct);
            await _kyc.LogAsync(userId, "sumsub_rejected", provider: "sumsub",
                                providerRef: payload.ApplicantId,
                                payload: new { payload.ReviewResult?.RejectLabels }, ct: ct);
        }
        else
        {
            await _kyc.LogAsync(userId, "sumsub_event", provider: "sumsub",
                                providerRef: payload.ApplicantId, payload: payload, ct: ct);
        }

        return Ok();
    }

    // ── helpers ──────────────────────────────────────────────────────────

    private async Task TryPromoteToLite(Guid userId, CancellationToken ct)
    {
        var u = await _db.Users
            .Where(x => x.Id == userId)
            .Select(x => new { x.IsPhoneVerified, x.Iin, x.KycStatus })
            .FirstAsync(ct);

        if (u.KycStatus == KycStatus.None && u.IsPhoneVerified && !string.IsNullOrEmpty(u.Iin))
            await _kyc.SetStatusAsync(userId, KycStatus.Lite, ct: ct);
    }

    private async Task<KycStatusDto> BuildStatusAsync(Guid userId, CancellationToken ct)
    {
        var u = await _db.Users
            .Where(x => x.Id == userId)
            .Select(x => new { x.IsPhoneVerified, x.Phone, x.Iin, x.KycStatus, x.KycVerifiedAt })
            .FirstAsync(ct);
        return new KycStatusDto(
            Status:          u.KycStatus.ToString(),
            PhoneVerified:   u.IsPhoneVerified,
            Phone:           u.Phone,
            HasIin:          !string.IsNullOrEmpty(u.Iin),
            VerifiedAt:      u.KycVerifiedAt);
    }
}

public sealed record KycStatusDto(
    string    Status,
    bool      PhoneVerified,
    string?   Phone,
    bool      HasIin,
    DateTime? VerifiedAt
);

public sealed record SumsubInitResponse(string ApplicantId, string AccessToken);

public sealed class SumsubWebhookPayload
{
    public string ApplicantId { get; set; } = string.Empty;
    public string Type        { get; set; } = string.Empty;
    public SumsubReviewResult? ReviewResult { get; set; }
}

public sealed class SumsubReviewResult
{
    public string?   ReviewAnswer { get; set; }
    public string[]? RejectLabels { get; set; }
}
