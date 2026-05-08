using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class UserSpecialtyGrantConfiguration : IEntityTypeConfiguration<UserSpecialtyGrant>
{
    public void Configure(EntityTypeBuilder<UserSpecialtyGrant> b)
    {
        b.ToTable("user_specialty_grants");

        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        b.Property(x => x.Specialty).HasConversion<byte>();

        b.Property(x => x.Note).HasMaxLength(512);

        b.Property(x => x.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        b.HasIndex(x => x.UserId)
            .HasDatabaseName("ix_specialty_grants_user_id");

        b.HasIndex(x => new { x.UserId, x.Specialty })
            .HasDatabaseName("ix_specialty_grants_user_specialty");

        b.HasIndex(x => x.ExpiresAt)
            .HasDatabaseName("ix_specialty_grants_expires_at");

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
