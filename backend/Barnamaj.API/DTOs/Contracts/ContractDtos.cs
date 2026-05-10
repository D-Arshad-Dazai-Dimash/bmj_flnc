namespace Barnamaj.API.DTOs.Contracts;

// ═══════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════

public sealed record CreateMilestoneDto(
    string    Title,
    decimal   Amount,
    DateTime? DueDate
);

public sealed record CreateContractDto(
    Guid                       ProjectId,
    Guid                       ExecutorProfileId,
    decimal                    TotalAmount,
    IReadOnlyList<CreateMilestoneDto> Milestones
);

public sealed record TransitionContractDto(
    string Status,
    string? Reason
);

public sealed record MilestoneActionDto(
    string? Notes
);

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

public sealed record MilestoneDto(
    Guid     Id,
    int      OrderIndex,
    string   Title,
    decimal  Amount,
    DateTime?DueDate,
    string   Status,
    string?  Notes,
    DateTime UpdatedAt
);

public sealed record ContractEventDto(
    Guid     Id,
    Guid     ActorProfileId,
    string   ActorProfileName,
    string   Action,
    string?  Details,
    DateTime CreatedAt
);

public sealed record ContractSummaryDto(
    Guid     Id,
    Guid     ProjectId,
    string   ProjectTitle,
    Guid     ClientProfileId,
    string   ClientProfileName,
    Guid     ExecutorProfileId,
    string   ExecutorProfileName,
    decimal  TotalAmount,
    string   Status,
    int      MilestonesTotal,
    int      MilestonesApproved,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record ContractDetailDto(
    Guid     Id,
    Guid     ProjectId,
    string   ProjectTitle,
    Guid     ClientProfileId,
    string   ClientProfileName,
    Guid     ExecutorProfileId,
    string   ExecutorProfileName,
    decimal  TotalAmount,
    string   Status,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<MilestoneDto>      Milestones,
    IReadOnlyList<ContractEventDto>  Events
);
