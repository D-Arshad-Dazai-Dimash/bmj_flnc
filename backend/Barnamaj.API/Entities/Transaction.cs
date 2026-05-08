namespace Barnamaj.API.Entities;

public class Transaction
{
    public Guid              Id          { get; set; }
    public Guid              WalletId    { get; set; }
    public Guid              UserId      { get; set; }
    public TransactionType   Type        { get; set; }
    public TransactionStatus Status      { get; set; }
    public decimal           Amount      { get; set; }
    public string?           Description { get; set; }
    public Guid?             RelatedProjectId { get; set; }
    public Guid?             CreatedByAdminId { get; set; }
    public DateTime          CreatedAt   { get; set; }

    // Navigation
    public Wallet  Wallet  { get; set; } = null!;
    public User    User    { get; set; } = null!;
}
