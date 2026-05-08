namespace Barnamaj.API.Entities;

/// <summary>
/// Временный или постоянный грант системной роли.
/// Позволяет повысить роль пользователя без изменения основного поля users.role.
/// HeadAdmin назначает грант; по истечении ExpiresAt грант игнорируется.
/// </summary>
public class UserRoleGrant
{
    public Guid      Id                 { get; set; }
    public Guid      UserId             { get; set; }
    public UserRole  GrantedRole        { get; set; }
    public DateTime? ExpiresAt          { get; set; }  // null = бессрочно
    public Guid      GrantedByAdminId   { get; set; }
    public string?   Reason             { get; set; }
    public bool      IsRevoked          { get; set; }  // явный отзыв до истечения
    public DateTime  CreatedAt          { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
