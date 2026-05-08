using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class WalletConfiguration : IEntityTypeConfiguration<Wallet>
{
    public void Configure(EntityTypeBuilder<Wallet> builder)
    {
        builder.ToTable("wallets");

        builder.HasKey(w => w.Id);
        builder.Property(w => w.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(w => w.AvailableBalance)
            .HasColumnType("numeric(18,2)")
            .HasDefaultValue(0m);

        builder.Property(w => w.FrozenBalance)
            .HasColumnType("numeric(18,2)")
            .HasDefaultValue(0m);

        builder.Property(w => w.PendingWithdrawal)
            .HasColumnType("numeric(18,2)")
            .HasDefaultValue(0m);

        builder.Property(w => w.UpdatedAt)
            .HasDefaultValueSql("now()");

        builder.HasOne(w => w.User)
            .WithOne()
            .HasForeignKey<Wallet>(w => w.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(w => w.UserId)
            .IsUnique()
            .HasDatabaseName("ix_wallets_user_id");
    }
}
