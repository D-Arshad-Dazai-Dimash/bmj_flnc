using System.Security.Claims;
using Barnamaj.API.DTOs.Kyc;
using Barnamaj.API.Entities;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

[ApiController]
[Route("api/kyc")]
[Authorize]
[Produces("application/json")]
public sealed class KycController : ControllerBase
{
    private readonly IKycService _kyc;
    public KycController(IKycService kyc) => _kyc = kyc;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    // ── 1. Phone ──────────────────────────────────────────────────────

    [HttpPost("phone/send-code")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SendPhoneCode(
        [FromBody] SendPhoneCodeDto dto, CancellationToken ct)
    {
        try
        {
            await _kyc.SendPhoneCodeAsync(CurrentUserId, dto.Phone, HttpContext, ct);
            return Ok(new { ok = true });
        }
        catch (KycException ex) when (ex.Code == "rate_limited")
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { error = ex.Message, code = ex.Code });
        }
        catch (KycException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.Code });
        }
    }

    [HttpPost("phone/verify")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyPhone(
        [FromBody] VerifyPhoneDto dto, CancellationToken ct)
    {
        try
        {
            await _kyc.VerifyPhoneAsync(CurrentUserId, dto.Phone, dto.Code, HttpContext, ct);
            return Ok(new { ok = true });
        }
        catch (KycException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.Code });
        }
    }

    // ── 2. ИИН ────────────────────────────────────────────────────────

    [HttpPost("iin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetIin([FromBody] SetIinDto dto, CancellationToken ct)
    {
        try
        {
            await _kyc.SetIinAsync(CurrentUserId, dto.Iin, HttpContext, ct);
            return Ok(new { ok = true });
        }
        catch (KycException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.Code });
        }
    }

    // ── 3. Документ ───────────────────────────────────────────────────

    [HttpPost("document")]
    [RequestSizeLimit(40 * 1024 * 1024)] // 3 файла × ~10 МБ
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadDocument(
        [FromForm] DocumentType documentType,
        [FromForm] IFormFile front,
        [FromForm] IFormFile selfie,
        [FromForm] IFormFile? back,
        CancellationToken ct)
    {
        if (front is null || selfie is null)
            return BadRequest(new { error = "front и selfie обязательны.", code = "missing_files" });

        try
        {
            var doc = await _kyc.UploadDocumentAsync(
                CurrentUserId, documentType, front, back, selfie, HttpContext, ct);
            return Ok(new { ok = true, documentId = doc.Id });
        }
        catch (KycException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.Code });
        }
    }

    // ── 4. Status ─────────────────────────────────────────────────────

    [HttpGet("status")]
    [ProducesResponseType(typeof(KycStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Status(CancellationToken ct)
    {
        var s = await _kyc.GetStatusAsync(CurrentUserId, ct);
        return Ok(s);
    }
}
