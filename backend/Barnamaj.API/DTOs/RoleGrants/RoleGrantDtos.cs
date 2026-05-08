using Barnamaj.API.Entities;

namespace Barnamaj.API.DTOs.RoleGrants;

public sealed record GrantRoleDto(
    UserRole  GrantedRole,
    DateTime? ExpiresAt,
    string?   Reason
);

public sealed record RoleGrantDto(
    Guid      Id,
    string    GrantedRole,
    DateTime? ExpiresAt,
    Guid      GrantedByAdminId,
    string?   Reason,
    bool      IsRevoked,
    bool      IsActive,
    DateTime  CreatedAt
);
