namespace Barnamaj.API.Entities;

/// <summary>
/// Сообщение в чате контракта. Чат привязан к контракту (одна нить на контракт).
/// </summary>
public class ChatMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid     ContractId { get; set; }
    public Contract Contract   { get; set; } = null!;

    /// <summary>Profile.Id отправителя (заказчик или исполнитель).</summary>
    public Guid SenderProfileId { get; set; }

    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
