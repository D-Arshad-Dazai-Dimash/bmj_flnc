using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.ToTable("refresh_tokens");

        b.HasKey(x => x.Id);
        // Id (jti) выдаётся приложением — без default

        b.Property(x => x.FamilyId).IsRequired();
        b.Property(x => x.TokenHash).IsRequired().HasMaxLength(128);
        b.Property(x => x.RevokedReason).HasMaxLength(64);
        b.Property(x => x.IpAddress).HasMaxLength(64);
        b.Property(x => x.UserAgent).HasMaxLength(512);

        b.Property(x => x.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        b.HasIndex(x => x.UserId).HasDatabaseName("ix_refresh_tokens_user");
        b.HasIndex(x => x.FamilyId).HasDatabaseName("ix_refresh_tokens_family");
        b.HasIndex(x => x.ExpiresAt).HasDatabaseName("ix_refresh_tokens_expires");

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
