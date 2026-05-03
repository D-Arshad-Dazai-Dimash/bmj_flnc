using Barnamaj.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Barnamaj.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db) => _db = db;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException());

    /// <summary>Лента моих уведомлений (последние 100).</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var uid = CurrentUserId;
        var items = await _db.Notifications
            .Where(n => n.UserId == uid)
            .OrderByDescending(n => n.CreatedAt)
            .Take(100)
            .Select(n => new { n.Id, n.Type, n.Title, n.PayloadJson, n.IsRead, n.CreatedAt })
            .ToListAsync(ct);

        var unreadCount = await _db.Notifications.CountAsync(n => n.UserId == uid && !n.IsRead, ct);
        return Ok(new { items, unreadCount });
    }

    /// <summary>Отметить уведомление прочитанным.</summary>
    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var uid = CurrentUserId;
        var rows = await _db.Notifications
            .Where(n => n.Id == id && n.UserId == uid && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true)
                                       .SetProperty(n => n.ReadAt, DateTime.UtcNow), ct);
        return rows == 0 ? NotFound() : NoContent();
    }

    /// <summary>Отметить все мои уведомления прочитанными.</summary>
    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var uid = CurrentUserId;
        await _db.Notifications
            .Where(n => n.UserId == uid && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true)
                                       .SetProperty(n => n.ReadAt, DateTime.UtcNow), ct);
        return NoContent();
    }
}
