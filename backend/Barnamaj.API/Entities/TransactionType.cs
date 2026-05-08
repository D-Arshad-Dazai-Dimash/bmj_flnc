namespace Barnamaj.API.Entities;

public enum TransactionType : byte
{
    Deposit         = 1,
    Withdrawal      = 2,
    EscrowHold      = 3,
    EscrowRelease   = 4,
    Refund          = 5,
    Commission      = 6,
    ManualAdjustment = 7,
}
