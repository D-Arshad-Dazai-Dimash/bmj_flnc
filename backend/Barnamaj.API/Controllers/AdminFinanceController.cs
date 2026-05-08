using System.Security.Claims;
using Barnamaj.API.DTOs.Wallet;
using Barnamaj.API.Entities;
using Barnamaj.API.Filters;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

[ApiController]
[Route("api/admin/finance")]
[Authorize]
[RequireRole(UserRole.Moderator)]
[Produces("application/json")]
public sealed class AdminFinanceController : ControllerBase
{
    private readonly IWalletService _walletService;
    private readonly IAuditService  _auditService;

    public AdminFinanceController(IWalletService walletService, IAuditService auditService)
    {
        _walletService = walletService;
        _auditService  = auditService;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    // GET /api/admin/finance/wallets
    [HttpGet("wallets")]
    public async Task<IActionResult> GetAllWallets(CancellationToken ct)
    {
        var wallets = await _walletService.GetAllWalletsAsync(ct);
        return Ok(wallets);
    }

    // PATCH /api/admin/finance/wallets/{userId}
    [HttpPatch("wallets/{userId:guid}")]
    [RequireRole(UserRole.SeniorAdmin)]
    public async Task<IActionResult> AdjustBalance(Guid userId, [FromBody] AdminAdjustBalanceDto dto, CancellationToken ct)
    {
        if (dto.Amount == 0)
            return BadRequest(new { error = "Сумма корректировки не может быть равна 0." });

        var wallet = await _walletService.AdminAdjustBalanceAsync(userId, dto.Amount, dto.Description, CurrentUserId, ct);

        await _auditService.LogAsync(
            CurrentUserId,
            "wallet.adjust",
            userId,
            new { dto.Amount, dto.Description },
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            ct);

        return Ok(wallet);
    }
}
