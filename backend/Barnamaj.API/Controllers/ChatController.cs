using System.Security.Claims;
using Barnamaj.API.DTOs.Chat;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Чат между пользователями. 1:1 диалоги, опционально привязанные к проекту.
/// </summary>
[ApiController]
[Route("api/chat")]
[Produces("application/json")]
[Authorize]
public sealed class ChatController : ControllerBase
{
    private readonly IChatService _chat;

    public ChatController(IChatService chat) { _chat = chat; }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    /// <summary>Список диалогов текущего пользователя.</summary>
    [HttpGet("threads")]
    [ProducesResponseType(typeof(IReadOnlyList<ChatThreadDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListThreads(CancellationToken ct)
    {
        var list = await _chat.ListThreadsAsync(CurrentUserId, ct);
        return Ok(list);
    }

    /// <summary>Открыть/создать диалог с указанным профилем.</summary>
    [HttpPost("threads")]
    [ProducesResponseType(typeof(ChatThreadDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> StartThread([FromBody] StartThreadDto dto, CancellationToken ct)
    {
        try
        {
            var thread = await _chat.StartThreadAsync(dto, CurrentUserId, ct);
            return Ok(thread);
        }
        catch (ChatException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    /// <summary>Сообщения в диалоге. Опциональный фильтр afterUtc (ISO-8601) для long-poll.</summary>
    [HttpGet("threads/{id:guid}/messages")]
    [ProducesResponseType(typeof(IReadOnlyList<ChatMessageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessages(
        Guid id, [FromQuery] DateTime? afterUtc, CancellationToken ct)
    {
        try
        {
            var msgs = await _chat.GetMessagesAsync(id, CurrentUserId, afterUtc, ct);
            return Ok(msgs);
        }
        catch (ChatException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    /// <summary>Отправить сообщение в диалог.</summary>
    [HttpPost("threads/{id:guid}/messages")]
    [ProducesResponseType(typeof(ChatMessageDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> SendMessage(
        Guid id, [FromBody] SendMessageDto dto, CancellationToken ct)
    {
        try
        {
            var msg = await _chat.SendMessageAsync(id, dto, CurrentUserId, ct);
            return StatusCode(StatusCodes.Status201Created, msg);
        }
        catch (ChatException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    /// <summary>Помечает диалог прочитанным.</summary>
    [HttpPost("threads/{id:guid}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        try
        {
            await _chat.MarkReadAsync(id, CurrentUserId, ct);
            return NoContent();
        }
        catch (ChatException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    /// <summary>Общее количество непрочитанных диалогов.</summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> UnreadCount(CancellationToken ct)
    {
        var n = await _chat.GetUnreadCountAsync(CurrentUserId, ct);
        return Ok(new { count = n });
    }
}
