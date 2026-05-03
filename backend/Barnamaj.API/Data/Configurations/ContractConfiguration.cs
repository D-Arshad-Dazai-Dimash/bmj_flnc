using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

/// <summary>
/// Конфигурация таблицы contracts.
/// </summary>
public class ContractConfiguration : IEntityTypeConfiguration<Contract>
{
    public void Configure(EntityTypeBuilder<Contract> builder)
    {
        builder.ToTable("contracts");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(c => c.Amount)
            .HasColumnType("numeric(14,2)")
            .IsRequired();

        builder.Property(c => c.Currency)
            .IsRequired()
            .HasMaxLength(3)
            .HasDefaultValue("KZT");

        builder.Property(c => c.Status)
            .HasConversion<byte>()
            .HasDefaultValue(ContractStatus.Draft);

        builder.Property(c => c.CreatedAt).HasDefaultValueSql("NOW()");
        builder.Property(c => c.UpdatedAt).HasDefaultValueSql("NOW()");

        builder.HasOne(c => c.Project)
            .WithMany()
            .HasForeignKey(c => c.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.ClientProfile)
            .WithMany()
            .HasForeignKey(c => c.ClientProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.ExecutorProfile)
            .WithMany()
            .HasForeignKey(c => c.ExecutorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => c.ClientProfileId);
        builder.HasIndex(c => c.ExecutorProfileId);
        builder.HasIndex(c => c.Status);
    }
}
