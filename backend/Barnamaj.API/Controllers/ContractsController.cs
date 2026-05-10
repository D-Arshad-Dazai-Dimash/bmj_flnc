using System.Security.Claims;
using Barnamaj.API.DTOs.Contracts;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

[ApiController]
[Route("api/contracts")]
[Produces("application/json")]
[Authorize]
public sealed class ContractsController : ControllerBase
{
    private readonly IContractService _svc;

    public ContractsController(IContractService svc) { _svc = svc; }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ContractSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListMine(CancellationToken ct)
    {
        var list = await _svc.ListMineAsync(CurrentUserId, ct);
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ContractDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        try { return Ok(await _svc.GetByIdAsync(id, CurrentUserId, ct)); }
        catch (ContractException ex) { return StatusCode(ex.StatusCode, new { error = ex.Message }); }
    }

    [HttpPost]
    [ProducesResponseType(typeof(ContractDetailDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateContractDto dto, CancellationToken ct)
    {
        try
        {
            var c = await _svc.CreateAsync(dto, CurrentUserId, ct);
            return StatusCode(StatusCodes.Status201Created, c);
        }
        catch (ContractException ex) { return StatusCode(ex.StatusCode, new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/transition")]
    [ProducesResponseType(typeof(ContractDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Transition(Guid id, [FromBody] TransitionContractDto dto, CancellationToken ct)
    {
        try { return Ok(await _svc.TransitionAsync(id, dto, CurrentUserId, ct)); }
        catch (ContractException ex) { return StatusCode(ex.StatusCode, new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/milestones/{milestoneId:guid}/submit")]
    [ProducesResponseType(typeof(ContractDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SubmitMilestone(
        Guid id, Guid milestoneId, [FromBody] MilestoneActionDto dto, CancellationToken ct)
    {
        try { return Ok(await _svc.SubmitMilestoneAsync(id, milestoneId, dto, CurrentUserId, ct)); }
        catch (ContractException ex) { return StatusCode(ex.StatusCode, new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/milestones/{milestoneId:guid}/approve")]
    [ProducesResponseType(typeof(ContractDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ApproveMilestone(
        Guid id, Guid milestoneId, [FromBody] MilestoneActionDto dto, CancellationToken ct)
    {
        try { return Ok(await _svc.ApproveMilestoneAsync(id, milestoneId, dto, CurrentUserId, ct)); }
        catch (ContractException ex) { return StatusCode(ex.StatusCode, new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/milestones/{milestoneId:guid}/reject")]
    [ProducesResponseType(typeof(ContractDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RejectMilestone(
        Guid id, Guid milestoneId, [FromBody] MilestoneActionDto dto, CancellationToken ct)
    {
        try { return Ok(await _svc.RejectMilestoneAsync(id, milestoneId, dto, CurrentUserId, ct)); }
        catch (ContractException ex) { return StatusCode(ex.StatusCode, new { error = ex.Message }); }
    }
}
