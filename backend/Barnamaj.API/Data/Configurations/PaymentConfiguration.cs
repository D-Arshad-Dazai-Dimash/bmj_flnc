using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

/// <summary>
/// Конфигурация таблицы payments — записи об эскроу-операциях.
/// </summary>
public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("payments");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(p => p.Amount)
            .HasColumnType("numeric(14,2)")
            .IsRequired();

        builder.Property(p => p.Currency)
            .IsRequired()
            .HasMaxLength(3)
            .HasDefaultValue("KZT");

        builder.Property(p => p.Provider)
            .IsRequired()
            .HasMaxLength(32)
            .HasDefaultValue("stub");

        builder.Property(p => p.ProviderRef)
            .HasMaxLength(128);

        builder.Property(p => p.Status)
            .HasConversion<byte>()
            .HasDefaultValue(PaymentStatus.Pending);

        builder.Property(p => p.CreatedAt).HasDefaultValueSql("NOW()");
        builder.Property(p => p.UpdatedAt).HasDefaultValueSql("NOW()");

        builder.HasOne(p => p.Contract)
            .WithMany()
            .HasForeignKey(p => p.ContractId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => p.ContractId);
        builder.HasIndex(p => p.ProviderRef);
    }
}
