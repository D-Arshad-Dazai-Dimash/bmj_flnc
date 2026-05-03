using Barnamaj.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Barnamaj.API.Hubs;

/// <summary>
/// Чат внутри контракта. Один чат = одна нить, привязанная к Contract.Id.
///
/// Клиент:
///   await connection.invoke("JoinContract", contractId)
///   await connection.invoke("SendMessage", contractId, body)
///   connection.on("message", payload => ...)
/// </summary>
[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _db;

    public ChatHub(AppDbContext db) => _db = db;

    private Guid CurrentProfileId =>
        Guid.TryParse(Context.User?.FindFirstValue("profile_id"), out var pid) ? pid : Guid.Empty;

    /// <summary>Войти в группу чата конкретного контракта (только сторона договора).</summary>
    public async Task JoinContract(Guid contractId)
    {
        if (!await UserIsParty(contractId))
            throw new HubException("Нет доступа к этому контракту.");

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(contractId));
    }

    public async Task LeaveContract(Guid contractId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(contractId));
    }

    /// <summary>Отправить сообщение в чат. Сохраняется в БД и рассылается группе.</summary>
    public async Task SendMessage(Guid contractId, string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return;
        if (body.Length > 4000) body = body[..4000];

        if (!await UserIsParty(contractId))
            throw new HubException("Нет доступа к этому контракту.");

        var msg = new Entities.ChatMessage
        {
            ContractId      = contractId,
            SenderProfileId = CurrentProfileId,
            Body            = body.Trim(),
        };
        _db.ChatMessages.Add(msg);
        await _db.SaveChangesAsync();

        await Clients.Group(GroupName(contractId)).SendAsync("message", new
        {
            id              = msg.Id,
            contractId      = msg.ContractId,
            senderProfileId = msg.SenderProfileId,
            body            = msg.Body,
            createdAt       = msg.CreatedAt,
        });
    }

    private static string GroupName(Guid contractId) => $"contract:{contractId:N}";

    private Task<bool> UserIsParty(Guid contractId)
    {
        var pid = CurrentProfileId;
        if (pid == Guid.Empty) return Task.FromResult(false);
        return _db.Contracts.AnyAsync(
            c => c.Id == contractId && (c.ClientProfileId == pid || c.ExecutorProfileId == pid));
    }
}
