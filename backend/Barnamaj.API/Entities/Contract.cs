namespace Barnamaj.API.Entities;

/// <summary>
/// Жизненный цикл контракта между заказчиком и исполнителем.
///
/// Draft       — создан, ждёт подписей.
/// Signed      — обе стороны подписали; ждём пополнения эскроу.
/// Funded      — заказчик пополнил эскроу; исполнитель может начинать работу.
/// InProgress  — работа идёт.
/// Released    — заказчик подтвердил приёмку; средства разблокированы исполнителю.
/// Disputed    — спор; ручное разбирательство (Неделя 5+).
/// Cancelled   — отменён до Funded; деньги, если были, возвращены.
/// </summary>
public enum ContractStatus : byte
{
    Draft       = 0,
    Signed      = 1,
    Funded      = 2,
    InProgress  = 3,
    Released    = 4,
    Disputed    = 5,
    Cancelled   = 6,
}

/// <summary>
/// Контракт по проекту.
///
/// Создаётся, когда заявка исполнителя принята.
/// Подписывается обеими сторонами, далее заказчик пополняет эскроу.
/// </summary>
public class Contract
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ProjectId         { get; set; }
    public Guid ClientProfileId   { get; set; }
    public Guid ExecutorProfileId { get; set; }

    /// <summary>Сумма контракта (валюта — ISO 4217, по умолчанию KZT).</summary>
    public decimal Amount   { get; set; }
    public string  Currency { get; set; } = "KZT";

    public ContractStatus Status { get; set; } = ContractStatus.Draft;

    public DateTime?  ClientSignedAt   { get; set; }
    public DateTime?  ExecutorSignedAt { get; set; }
    public DateTime?  FundedAt         { get; set; }
    public DateTime?  ReleasedAt       { get; set; }
    public DateTime?  CancelledAt      { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Project? Project          { get; set; }
    public Profile? ClientProfile    { get; set; }
    public Profile? ExecutorProfile  { get; set; }
}
