using Barnamaj.API.Entities;

namespace Barnamaj.API.DTOs.Specialties;

public sealed record GrantSpecialtyDto(
    Specialty Specialty,
    DateTime? ExpiresAt,
    string?   Note
);

public sealed record SpecialtyGrantDto(
    Guid      Id,
    string    Specialty,
    DateTime? ExpiresAt,
    Guid      GrantedByAdminId,
    string?   Note,
    DateTime  CreatedAt,
    bool      IsActive
);
