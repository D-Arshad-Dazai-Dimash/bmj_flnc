using System.Security.Claims;
using Barnamaj.API.DTOs.Kyc;
using Barnamaj.API.Entities;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Barnamaj.API.Controllers;

[ApiController]
[Route("api/kyc")]
[Authorize]
[Produces("application/json")]
public sealed class KycController : ControllerBase
{
    private readonly IKycService           _kyc;
    private readonly IKycSubmissionService _submissions;

    public KycController(IKycService kyc, IKycSubmissionService submissions)
    {
        _kyc         = kyc;
        _submissions = submissions;
    }

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
    [EnableRateLimiting("kyc-upload")]
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

    // ── 5. Individual submission (физ. лицо) ──────────────────────────

    /// <summary>
    /// Финализирует Individual KYC: оборачивает уже загруженный документ
    /// в KycSubmission, прогоняет AI-проверку, отправляет модератору.
    /// </summary>
    [HttpPost("individual/submit")]
    [ProducesResponseType(typeof(SubmissionSummaryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitIndividual(CancellationToken ct)
    {
        try
        {
            var s = await _submissions.SubmitIndividualAsync(CurrentUserId, HttpContext, ct);
            return StatusCode(StatusCodes.Status201Created, new SubmissionSummaryDto(
                s.Id, s.Kind.ToString(), s.Status.ToString(), s.AiDecision,
                s.CreatedAt, s.ReviewedAt, s.RejectionReason));
        }
        catch (KycException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.Code });
        }
    }

    // ── 6. Legal lookup БИН (autofill формы) ──────────────────────────

    /// <summary>
    /// Поиск юр. лица по БИН в реестре (statgov stub в v1).
    /// Возвращает данные для автозаполнения формы Legal-KYC. Открыт для
    /// авторизованных пользователей; реальный реестр имеет свой rate-limit.
    /// </summary>
    [HttpGet("legal/lookup/{bin}")]
    [ProducesResponseType(typeof(LegalEntityLookupDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> LookupBin([FromRoute] string bin, CancellationToken ct)
    {
        var info = await _submissions.LookupLegalEntityAsync(bin, ct);
        if (info is null)
            return NotFound(new { error = "БИН не найден в реестре.", code = "not_found" });
        return Ok(info);
    }

    // ── 7. Legal submission (юр. лицо) ────────────────────────────────

    /// <summary>
    /// Подаёт Legal KYC-заявку: реквизиты юр. лица + ответственное лицо +
    /// документы. Создаётся KycSubmission(Kind=Legal), запускается AI-проверка.
    ///
    /// Поля и файлы передаются как multipart/form-data.
    /// Обязательные файлы: <c>responsibleIdFront</c>, <c>responsibleIdSelfie</c>.
    /// <c>authorityDocument</c> обязателен, кроме случая ИП с representative=Owner.
    /// </summary>
    [HttpPost("legal/submit")]
    [EnableRateLimiting("kyc-upload")]
    [RequestSizeLimit(60 * 1024 * 1024)] // до 6 файлов
    [ProducesResponseType(typeof(SubmissionSummaryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitLegal(
        [FromForm] LegalKycFieldsDto fields,
        [FromForm] IFormFile responsibleIdFront,
        [FromForm] IFormFile responsibleIdSelfie,
        [FromForm] IFormFile? responsibleIdBack,
        [FromForm] IFormFile? authorityDocument,
        [FromForm] IFormFile? companyRegistration,
        CancellationToken ct)
    {
        try
        {
            var s = await _submissions.SubmitLegalAsync(
                CurrentUserId, fields,
                responsibleIdFront, responsibleIdSelfie, responsibleIdBack,
                authorityDocument, companyRegistration, HttpContext, ct);

            return StatusCode(StatusCodes.Status201Created, new SubmissionSummaryDto(
                s.Id, s.Kind.ToString(), s.Status.ToString(), s.AiDecision,
                s.CreatedAt, s.ReviewedAt, s.RejectionReason));
        }
        catch (KycException ex)
        {
            return BadRequest(new { error = ex.Message, code = ex.Code });
        }
    }
}
