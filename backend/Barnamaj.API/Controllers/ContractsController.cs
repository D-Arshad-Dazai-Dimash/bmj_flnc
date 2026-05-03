using Barnamaj.API.DTOs.Contracts;
using Barnamaj.API.Entities;
using Barnamaj.API.Extensions;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Barnamaj.API.Controllers;

/// <summary>
/// CRUD по контрактам между заказчиком и исполнителем.
/// Доступ — только зарегистрированным пользователям; создание контракта
/// требует KYC Lite (телефон + ИИН).
/// </summary>
[ApiController]
[Route("api/contracts")]
[Authorize]
public class ContractsController : ControllerBase
{
    private readonly IContractService _contracts;

    public ContractsController(IContractService contracts) => _contracts = contracts;

    private Guid CurrentProfileId =>
        Guid.TryParse(User.FindFirstValue("profile_id"), out var pid)
            ? pid
            : throw new UnauthorizedAccessException("Не выбран активный профиль.");

    /// <summary>Список моих контрактов (где я заказчик или исполнитель).</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok(await _contracts.ListMineAsync(CurrentProfileId, ct));

    /// <summary>Получить контракт по id.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        try
        {
            var c = await _contracts.GetAsync(id, CurrentProfileId, ct);
            return c is null ? NotFound() : Ok(c);
        }
        catch (UnauthorizedAccessException ex) { return Forbid(); }
    }

    /// <summary>Создать контракт. Требует KYC Lite.</summary>
    [HttpPost]
    [RequireKyc(KycStatus.Lite)]
    public async Task<IActionResult> Create([FromBody] CreateContractDto dto, CancellationToken ct)
    {
        try
        {
            var created = await _contracts.CreateAsync(CurrentProfileId, dto, ct);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { error = ex.Message }); }
        catch (InvalidOperationException ex)   { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Подписать контракт (любая из сторон).</summary>
    [HttpPost("{id:guid}/sign")]
    [RequireKyc(KycStatus.Lite)]
    public async Task<IActionResult> Sign(Guid id, CancellationToken ct)
    {
        try { return Ok(await _contracts.SignAsync(id, CurrentProfileId, ct)); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { error = ex.Message }); }
        catch (InvalidOperationException ex)   { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Подтвердить приёмку: разблокировать средства исполнителю. Только заказчик.</summary>
    [HttpPost("{id:guid}/release")]
    [RequireKyc(KycStatus.Lite)]
    public async Task<IActionResult> Release(Guid id, CancellationToken ct)
    {
        try { return Ok(await _contracts.ReleaseAsync(id, CurrentProfileId, ct)); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { error = ex.Message }); }
        catch (InvalidOperationException ex)   { return BadRequest(new { error = ex.Message }); }
    }
}
