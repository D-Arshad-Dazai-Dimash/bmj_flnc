namespace Barnamaj.API.Entities;

/// <summary>
/// Состояние транзакции эскроу.
///
/// Pending  — initiated, ждём подтверждение от провайдера.
/// Held     — деньги зарезервированы (в эскроу).
/// Released — деньги выплачены исполнителю.
/// Refunded — возврат заказчику (отмена/спор).
/// Failed   — ошибка платежа.
/// </summary>
public enum PaymentStatus : byte
{
    Pending  = 0,
    Held     = 1,
    Released = 2,
    Refunded = 3,
    Failed   = 4,
}

/// <summary>
/// Запись о денежной операции по контракту (эскроу).
/// Один контракт может иметь несколько Payment (например, поэтапная оплата),
/// но в Неделе 2 — ровно один Payment типа Held.
/// </summary>
public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid     ContractId { get; set; }
    public Contract Contract   { get; set; } = null!;

    public decimal Amount   { get; set; }
    public string  Currency { get; set; } = "KZT";

    /// <summary>Имя провайдера: "stub" в dev, "kaspi" / "freedom" / "stripe" в prod.</summary>
    public string  Provider    { get; set; } = "stub";
    public string? ProviderRef { get; set; }

    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
