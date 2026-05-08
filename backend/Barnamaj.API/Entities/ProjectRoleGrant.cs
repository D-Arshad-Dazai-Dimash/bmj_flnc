namespace Barnamaj.API.Entities;

public class ProjectRoleGrant
{
    public Guid        Id               { get; set; }
    public Guid        ProjectId        { get; set; }
    public Guid        UserId           { get; set; }
    public ProjectRole Role             { get; set; }
    public Guid        GrantedByAdminId { get; set; }
    public DateTime    CreatedAt        { get; set; } = DateTime.UtcNow;

    public Project     Project          { get; set; } = null!;
    public User        User             { get; set; } = null!;
}
