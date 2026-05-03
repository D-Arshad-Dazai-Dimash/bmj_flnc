using Barnamaj.API.DTOs.Contracts;
using Barnamaj.API.Entities;
using Barnamaj.API.Extensions;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Эскроу-платежи по контрактам. Требует KYC Full (документ + селфи)
/// в соответствии с законом РК «О ПОД/ФТ».
/// </summary>
[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _payments;

    public PaymentsController(IPaymentService payments) => _payments = payments;

    private Guid CurrentProfileId =>
        Guid.TryParse(User.FindFirstValue("profile_id"), out var pid)
            ? pid
            : throw new UnauthorizedAccessException("Не выбран активный профиль.");

    /// <summary>Инициировать эскроу-платёж по контракту.</summary>
    [HttpPost("initiate")]
    [RequireKyc(KycStatus.Full)]
    public async Task<IActionResult> Initiate([FromBody] InitiatePaymentDto dto, CancellationToken ct)
    {
        try { return Ok(await _payments.InitiateAsync(CurrentProfileId, dto.ContractId, ct)); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { error = ex.Message }); }
        catch (InvalidOperationException ex)   { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Webhook от платёжного провайдера. Заглушка для Недели 2 — возвращает 200.</summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    public IActionResult Webhook()
    {
        // TODO (Неделя 4): валидация подписи провайдера, парсинг события, обновление Payment.Status.
        return Ok();
    }
}
