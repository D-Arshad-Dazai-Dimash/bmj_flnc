namespace Barnamaj.API.Entities;

public enum TransactionStatus : byte
{
    Pending   = 1,
    Completed = 2,
    Failed    = 3,
    Cancelled = 4,
}
