namespace Barnamaj.API.Entities;

/// <summary>
/// Уведомление пользователя в личном фиде.
/// Доставляется realtime через NotificationsHub и хранится в БД для истории.
/// </summary>
public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Кому адресовано (User.Id, не Profile.Id).</summary>
    public Guid UserId { get; set; }

    /// <summary>Машинный тип события: contract_signed, payment_funded, work_released, ...</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>Заголовок для UI.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Произвольная JSON-нагрузка (contractId, amount, ...).</summary>
    public string? PayloadJson { get; set; }

    public bool      IsRead    { get; set; } = false;
    public DateTime  CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt    { get; set; }
}
