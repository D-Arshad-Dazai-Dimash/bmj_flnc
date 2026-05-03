using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

/// <summary>
/// Конфигурация таблицы kyc_events — журнал KYC-событий.
/// </summary>
public class KycEventConfiguration : IEntityTypeConfiguration<KycEvent>
{
    public void Configure(EntityTypeBuilder<KycEvent> builder)
    {
        builder.ToTable("kyc_events");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(e => e.EventType)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(e => e.Provider)
            .HasMaxLength(32);

        builder.Property(e => e.ProviderRef)
            .HasMaxLength(128);

        builder.Property(e => e.PayloadJson)
            .HasColumnType("jsonb");

        builder.Property(e => e.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        builder.HasIndex(e => new { e.UserId, e.CreatedAt })
            .HasDatabaseName("ix_kyc_events_user_created");

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
