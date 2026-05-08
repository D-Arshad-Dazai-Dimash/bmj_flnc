namespace Barnamaj.API.Entities;

/// <summary>
/// Выданная специализация — связь пользователя с конкретной областью доступа.
/// ExpiresAt = null означает бессрочный грант.
/// </summary>
public class UserSpecialtyGrant
{
    public Guid      Id                 { get; set; }
    public Guid      UserId             { get; set; }
    public Specialty Specialty          { get; set; }
    public DateTime? ExpiresAt          { get; set; }
    public Guid      GrantedByAdminId   { get; set; }
    public string?   Note               { get; set; }   // причина выдачи
    public DateTime  CreatedAt          { get; set; }

    // Navigation
    public User User  { get; set; } = null!;
}
