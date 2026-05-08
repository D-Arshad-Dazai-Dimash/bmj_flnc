using System.Security.Claims;
using Barnamaj.API.DTOs.Wallet;
using Barnamaj.API.Filters;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

[ApiController]
[Route("api/wallet")]
[Authorize]
[Produces("application/json")]
public sealed class WalletController : ControllerBase
{
    private readonly IWalletService _walletService;

    public WalletController(IWalletService walletService) => _walletService = walletService;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    // GET /api/wallet/me
    [HttpGet("me")]
    public async Task<IActionResult> GetMyWallet(CancellationToken ct)
    {
        var wallet = await _walletService.GetOrCreateWalletAsync(CurrentUserId, ct);
        return Ok(wallet);
    }

    // GET /api/wallet/history?page=1&pageSize=20
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        if (pageSize > 100) pageSize = 100;
        var result = await _walletService.GetHistoryAsync(CurrentUserId, page, pageSize, ct);
        return Ok(result);
    }
}
