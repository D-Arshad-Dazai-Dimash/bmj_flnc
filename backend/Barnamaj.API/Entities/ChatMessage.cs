namespace Barnamaj.API.Entities;

/// <summary>
/// Сообщение в чате (1:N к ChatThread).
///
/// IsSystem=true означает служебное сообщение (например, «отклик отправлен»),
/// SenderProfileId всё равно проставляется (= инициатор события).
/// </summary>
public class ChatMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid       ThreadId { get; set; }
    public ChatThread Thread   { get; set; } = null!;

    public Guid    SenderProfileId { get; set; }
    public Profile SenderProfile   { get; set; } = null!;

    public string Body { get; set; } = string.Empty;

    public bool IsSystem { get; set; } = false;

    /// <summary>
    /// Опциональная ссылка на проект (например, для системных сообщений
    /// «откликнулся на ваш проект»).
    /// </summary>
    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
