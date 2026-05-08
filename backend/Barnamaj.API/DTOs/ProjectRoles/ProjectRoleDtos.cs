using Barnamaj.API.Entities;

namespace Barnamaj.API.DTOs.ProjectRoles;

public record GrantProjectRoleDto(
    Guid       UserId,
    ProjectRole Role
);

public record ProjectRoleGrantDto(
    Guid     Id,
    Guid     ProjectId,
    Guid     UserId,
    string   Role,
    Guid     GrantedByAdminId,
    DateTime CreatedAt
);
