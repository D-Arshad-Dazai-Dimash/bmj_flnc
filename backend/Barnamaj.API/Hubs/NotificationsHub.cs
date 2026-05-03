using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Barnamaj.API.Hubs;

/// <summary>
/// Личные уведомления пользователя. Группа per-user: "user:{userId}".
///
/// Клиент:
///   const conn = new HubConnectionBuilder().withUrl("/hubs/notifications").build()
///   conn.on("notification", n => ...)
/// </summary>
[Authorize]
public class NotificationsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue("sub");
        if (Guid.TryParse(userId, out var uid))
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(uid));
        await base.OnConnectedAsync();
    }

    public static string GroupName(Guid userId) => $"user:{userId:N}";
}
