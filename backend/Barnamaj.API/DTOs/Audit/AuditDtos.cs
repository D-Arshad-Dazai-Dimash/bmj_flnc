namespace Barnamaj.API.DTOs.Audit;

public sealed record AuditLogDto(
    Guid     Id,
    Guid     AdminId,
    string   AdminEmail,
    string   Action,
    Guid?    TargetUserId,
    string?  TargetEmail,
    string?  Payload,
    string?  IpAddress,
    DateTime CreatedAt
);

public sealed record AuditLogPageDto(
    List<AuditLogDto> Items,
    int               Total,
    int               Page,
    int               PageSize
);
