using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class KycEventConfiguration : IEntityTypeConfiguration<KycEvent>
{
    public void Configure(EntityTypeBuilder<KycEvent> b)
    {
        b.ToTable("kyc_events");

        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        b.Property(x => x.EventType).IsRequired().HasMaxLength(64);
        b.Property(x => x.Provider).HasMaxLength(32);
        b.Property(x => x.ProviderRef).HasMaxLength(128);
        b.Property(x => x.PayloadJson).HasColumnType("jsonb");
        b.Property(x => x.IpAddress).HasMaxLength(64);
        b.Property(x => x.UserAgent).HasMaxLength(512);

        b.Property(x => x.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        b.HasIndex(x => new { x.UserId, x.CreatedAt })
            .HasDatabaseName("ix_kyc_events_user_created");

        b.HasIndex(x => x.EventType)
            .HasDatabaseName("ix_kyc_events_type");

        b.HasOne(x => x.User)
            .WithMany(u => u.KycEvents)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
