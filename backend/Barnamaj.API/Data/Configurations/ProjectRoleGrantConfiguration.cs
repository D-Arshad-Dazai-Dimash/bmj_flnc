using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class ProjectRoleGrantConfiguration : IEntityTypeConfiguration<ProjectRoleGrant>
{
    public void Configure(EntityTypeBuilder<ProjectRoleGrant> b)
    {
        b.ToTable("project_role_grants");

        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        b.Property(x => x.Role).HasColumnType("smallint");
        b.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        b.HasOne(x => x.Project)
            .WithMany()
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.ProjectId, x.UserId, x.Role }).IsUnique();
        b.HasIndex(x => x.UserId);
        b.HasIndex(x => x.ProjectId);
    }
}
