namespace Barnamaj.API.Entities;

public class Wallet
{
    public Guid   Id                 { get; set; }
    public Guid   UserId             { get; set; }
    public decimal AvailableBalance  { get; set; }
    public decimal FrozenBalance     { get; set; }
    public decimal PendingWithdrawal { get; set; }
    public DateTime UpdatedAt        { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
