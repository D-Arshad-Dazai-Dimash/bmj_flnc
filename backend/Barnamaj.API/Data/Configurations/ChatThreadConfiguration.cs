using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class ChatThreadConfiguration : IEntityTypeConfiguration<ChatThread>
{
    public void Configure(EntityTypeBuilder<ChatThread> builder)
    {
        builder.ToTable("chat_threads");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(t => t.CreatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAdd();
        builder.Property(t => t.UpdatedAt).HasDefaultValueSql("NOW()");

        // Уникальная пара
        builder.HasIndex(t => new { t.Profile1Id, t.Profile2Id })
            .IsUnique()
            .HasDatabaseName("ix_chat_threads_pair_unique");

        builder.HasIndex(t => t.UpdatedAt)
            .HasDatabaseName("ix_chat_threads_updated_at");

        builder.HasOne(t => t.Profile1)
            .WithMany()
            .HasForeignKey(t => t.Profile1Id)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Profile2)
            .WithMany()
            .HasForeignKey(t => t.Profile2Id)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Project)
            .WithMany()
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
