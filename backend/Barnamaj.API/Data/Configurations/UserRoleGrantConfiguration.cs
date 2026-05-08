using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class UserRoleGrantConfiguration : IEntityTypeConfiguration<UserRoleGrant>
{
    public void Configure(EntityTypeBuilder<UserRoleGrant> b)
    {
        b.ToTable("user_role_grants");

        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        b.Property(x => x.GrantedRole).HasConversion<byte>();

        b.Property(x => x.Reason).HasMaxLength(512);

        b.Property(x => x.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        b.HasIndex(x => x.UserId)
            .HasDatabaseName("ix_role_grants_user_id");

        b.HasIndex(x => new { x.UserId, x.GrantedRole })
            .HasDatabaseName("ix_role_grants_user_role");

        b.HasIndex(x => x.ExpiresAt)
            .HasDatabaseName("ix_role_grants_expires_at");

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
