namespace Barnamaj.API.Entities;

/// <summary>
/// Жизненный цикл контракта.
///
/// Draft     — создан заказчиком, ожидает согласия исполнителя
/// Active    — обе стороны согласились, идёт работа
/// InReview  — все этапы переданы на проверку (промежуточный статус)
/// Released  — все этапы приняты, средства выплачены (терминальный)
/// Disputed  — открыт спор
/// Cancelled — контракт отменён до выполнения (терминальный)
/// </summary>
public enum ContractStatus : byte
{
    Draft     = 0,
    Active    = 1,
    InReview  = 2,
    Released  = 3,
    Disputed  = 4,
    Cancelled = 5,
}

public enum MilestoneStatus : byte
{
    Pending   = 0,
    Submitted = 1,
    Approved  = 2,
    Rejected  = 3,
}

/// <summary>
/// Контракт между заказчиком и исполнителем по проекту.
/// MVP-эскроу: средства не списываются физически, но статус и история
/// этапов фиксируются в БД и доступны обеим сторонам.
/// </summary>
public class Contract
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid    ProjectId { get; set; }
    public Project Project   { get; set; } = null!;

    public Guid    ClientProfileId { get; set; }
    public Profile ClientProfile   { get; set; } = null!;

    public Guid    ExecutorProfileId { get; set; }
    public Profile ExecutorProfile   { get; set; } = null!;

    /// <summary>Сумма контракта в тенге (precision 18,2).</summary>
    public decimal TotalAmount { get; set; }

    public ContractStatus Status { get; set; } = ContractStatus.Draft;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ContractMilestone> Milestones { get; set; } = new List<ContractMilestone>();
    public ICollection<ContractEvent>     Events     { get; set; } = new List<ContractEvent>();
}

/// <summary>
/// Этап контракта. Этапы сдаются последовательно: следующий нельзя
/// сабмитить, пока предыдущий не Approved.
/// </summary>
public class ContractMilestone
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid     ContractId { get; set; }
    public Contract Contract   { get; set; } = null!;

    /// <summary>Порядковый номер (0..n-1) — определяет последовательность.</summary>
    public int OrderIndex { get; set; }

    public string Title { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public DateTime? DueDate { get; set; }

    public MilestoneStatus Status { get; set; } = MilestoneStatus.Pending;

    public string? Notes { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Событие в истории контракта (создание, смена статуса, операции с этапами).
/// </summary>
public class ContractEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid     ContractId { get; set; }
    public Contract Contract   { get; set; } = null!;

    public Guid    ActorProfileId { get; set; }
    public Profile ActorProfile   { get; set; } = null!;

    public string Action  { get; set; } = string.Empty;
    public string? Details { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
