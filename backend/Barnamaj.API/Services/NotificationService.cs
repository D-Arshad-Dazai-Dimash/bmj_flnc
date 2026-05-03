using Barnamaj.API.Data;
using Barnamaj.API.Entities;
using Barnamaj.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json;

namespace Barnamaj.API.Services;

/// <summary>
/// Создаёт уведомления (хранит в БД + отправляет в SignalR-группу пользователя).
/// </summary>
public interface INotificationService
{
    Task PushAsync(Guid userId, string type, string title, object? payload = null, CancellationToken ct = default);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext               _db;
    private readonly IHubContext<NotificationsHub> _hub;

    public NotificationService(AppDbContext db, IHubContext<NotificationsHub> hub)
    {
        _db  = db;
        _hub = hub;
    }

    public async Task PushAsync(Guid userId, string type, string title, object? payload = null, CancellationToken ct = default)
    {
        var n = new Notification
        {
            UserId      = userId,
            Type        = type,
            Title       = title,
            PayloadJson = payload is null ? null : JsonSerializer.Serialize(payload),
        };
        _db.Notifications.Add(n);
        await _db.SaveChangesAsync(ct);

        await _hub.Clients.Group(NotificationsHub.GroupName(userId))
            .SendAsync("notification", new
            {
                id        = n.Id,
                type      = n.Type,
                title     = n.Title,
                payload,
                isRead    = false,
                createdAt = n.CreatedAt,
            }, ct);
    }
}
