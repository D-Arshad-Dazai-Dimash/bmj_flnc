using Barnamaj.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Barnamaj.API.Controllers;

/// <summary>
/// История чата по контракту. Realtime — через ChatHub.
/// </summary>
[ApiController]
[Route("api/contracts/{contractId:guid}/messages")]
[Authorize]
public class ChatMessagesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ChatMessagesController(AppDbContext db) => _db = db;

    private Guid CurrentProfileId =>
        Guid.TryParse(User.FindFirstValue("profile_id"), out var pid)
            ? pid
            : throw new UnauthorizedAccessException();

    [HttpGet]
    public async Task<IActionResult> List(Guid contractId, CancellationToken ct)
    {
        var pid = CurrentProfileId;

        var allowed = await _db.Contracts.AnyAsync(
            c => c.Id == contractId && (c.ClientProfileId == pid || c.ExecutorProfileId == pid), ct);
        if (!allowed) return Forbid();

        var msgs = await _db.ChatMessages
            .Where(m => m.ContractId == contractId)
            .OrderBy(m => m.CreatedAt)
            .Take(500)
            .Select(m => new
            {
                id              = m.Id,
                contractId      = m.ContractId,
                senderProfileId = m.SenderProfileId,
                body            = m.Body,
                createdAt       = m.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(msgs);
    }
}
