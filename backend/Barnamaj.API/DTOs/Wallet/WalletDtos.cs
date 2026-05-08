namespace Barnamaj.API.DTOs.Wallet;

public record WalletDto(
    Guid    WalletId,
    decimal AvailableBalance,
    decimal FrozenBalance,
    decimal PendingWithdrawal,
    DateTime UpdatedAt
);

public record TransactionDto(
    Guid     Id,
    string   Type,
    string   Status,
    decimal  Amount,
    string?  Description,
    Guid?    RelatedProjectId,
    DateTime CreatedAt
);

public record WalletHistoryDto(
    WalletDto Wallet,
    IReadOnlyList<TransactionDto> Transactions,
    int Total,
    int Page,
    int PageSize
);

// Admin DTOs
public record AdminWalletSummaryDto(
    Guid    UserId,
    string  Email,
    string  FullName,
    Guid    WalletId,
    decimal AvailableBalance,
    decimal FrozenBalance,
    decimal PendingWithdrawal,
    DateTime UpdatedAt
);

public record AdminAdjustBalanceDto(
    decimal Amount,
    string? Description
);
