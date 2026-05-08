namespace Barnamaj.API.Entities;

/// <summary>
/// Лог административных действий.
/// Пишется для каждого SeniorAdmin+ действия с изменением данных.
/// </summary>
public class AdminAuditLog
{
    public Guid    Id             { get; set; }
    public Guid    AdminId        { get; set; }
    public string  Action         { get; set; } = string.Empty; // "wallet.adjust", "specialty.grant", ...
    public Guid?   TargetUserId   { get; set; }
    public string? Payload        { get; set; }   // JSON snapshot
    public string? IpAddress      { get; set; }
    public DateTime CreatedAt     { get; set; }

    // Navigation
    public User Admin { get; set; } = null!;
}
