using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> b)
    {
        b.ToTable("chat_messages");
        b.HasKey(m => m.Id);
        b.Property(m => m.Id).HasDefaultValueSql("gen_random_uuid()");

        b.Property(m => m.Body).IsRequired().HasMaxLength(4000);
        b.Property(m => m.CreatedAt).HasDefaultValueSql("NOW()");

        b.HasIndex(m => new { m.ContractId, m.CreatedAt });

        b.HasOne(m => m.Contract)
            .WithMany()
            .HasForeignKey(m => m.ContractId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
