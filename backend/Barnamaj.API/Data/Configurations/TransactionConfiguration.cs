using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("transactions");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(t => t.Type)
            .HasConversion<byte>();

        builder.Property(t => t.Status)
            .HasConversion<byte>()
            .HasDefaultValue(TransactionStatus.Pending);

        builder.Property(t => t.Amount)
            .HasColumnType("numeric(18,2)");

        builder.Property(t => t.Description)
            .HasMaxLength(512);

        builder.Property(t => t.CreatedAt)
            .HasDefaultValueSql("now()");

        builder.HasOne(t => t.Wallet)
            .WithMany(w => w.Transactions)
            .HasForeignKey(t => t.WalletId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.WalletId)
            .HasDatabaseName("ix_transactions_wallet_id");

        builder.HasIndex(t => t.CreatedAt)
            .HasDatabaseName("ix_transactions_created_at");
    }
}
