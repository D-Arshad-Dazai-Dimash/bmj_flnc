namespace Barnamaj.API.DTOs.Contracts;

/// <summary>Запрос на создание контракта (после принятия заявки).</summary>
public sealed record CreateContractDto(Guid ProjectId, Guid ExecutorProfileId, decimal Amount);

/// <summary>Сводка по контракту для списков.</summary>
public sealed record ContractSummaryDto(
    Guid     Id,
    Guid     ProjectId,
    string   ProjectTitle,
    string   Status,
    decimal  Amount,
    string   Currency,
    string   ClientProfileName,
    string   ExecutorProfileName,
    DateTime CreatedAt
);

/// <summary>Полная информация по контракту.</summary>
public sealed record ContractDetailDto(
    Guid      Id,
    Guid      ProjectId,
    string    ProjectTitle,
    string    Status,
    decimal   Amount,
    string    Currency,
    Guid      ClientProfileId,
    string    ClientProfileName,
    Guid      ExecutorProfileId,
    string    ExecutorProfileName,
    DateTime? ClientSignedAt,
    DateTime? ExecutorSignedAt,
    DateTime? FundedAt,
    DateTime? ReleasedAt,
    DateTime  CreatedAt,
    PaymentSummaryDto? Payment
);

public sealed record PaymentSummaryDto(
    Guid          Id,
    decimal       Amount,
    string        Currency,
    string        Provider,
    string?       ProviderRef,
    string        Status,
    DateTime      CreatedAt
);

public sealed record InitiatePaymentDto(Guid ContractId);
public sealed record InitiatePaymentResponse(Guid PaymentId, string Provider, string ProviderRef, string Status);
