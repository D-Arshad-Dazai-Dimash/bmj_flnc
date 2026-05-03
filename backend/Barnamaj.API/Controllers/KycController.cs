using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Auth;
using Barnamaj.API.Entities;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
    private readonly ILogger<KycController> _logger;

    public KycController(
        AppDbContext db, IKycService kyc, IOtpService otp,
        ISmsProvider sms, ILogger<KycController> logger)
    {
        _db = db; _kyc = kyc; _otp = otp; _sms = sms; _logger = logger;
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
