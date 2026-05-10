using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.ToTable("chat_messages");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(m => m.Body).HasMaxLength(5000).IsRequired();
        builder.Property(m => m.IsSystem).HasDefaultValue(false);

        builder.Property(m => m.CreatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAdd();

        builder.HasOne(m => m.Thread)
            .WithMany(t => t.Messages)
            .HasForeignKey(m => m.ThreadId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.SenderProfile)
            .WithMany()
            .HasForeignKey(m => m.SenderProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Project)
            .WithMany()
            .HasForeignKey(m => m.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(m => new { m.ThreadId, m.CreatedAt })
            .HasDatabaseName("ix_chat_messages_thread_created");
    }
}
