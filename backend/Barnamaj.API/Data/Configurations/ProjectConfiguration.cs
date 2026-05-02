using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

/// <summary>
/// Fluent API конфигурация таблицы projects.
/// </summary>
public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("projects");

        // ── PK ───────────────────────────────────────────────
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // ── Title ────────────────────────────────────────────
        builder.Property(p => p.Title)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(p => p.Title)
            .HasDatabaseName("ix_projects_title");

        // ── Description ──────────────────────────────────────
        builder.Property(p => p.Description)
            .HasMaxLength(10_000);

        // ── Budget ───────────────────────────────────────────
        // precision 18, scale 2 → до 9 999 999 999 999 999.99
        builder.Property(p => p.Budget)
            .HasPrecision(18, 2)
            .IsRequired(false);

        // ── Deadline ─────────────────────────────────────────
        builder.Property(p => p.Deadline)
            .IsRequired(false);

        // ── Status ───────────────────────────────────────────
        builder.Property(p => p.Status)
            .HasConversion<byte>();

        builder.HasIndex(p => p.Status)
            .HasDatabaseName("ix_projects_status");

        // ── Временные метки ──────────────────────────────────
        builder.Property(p => p.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        builder.Property(p => p.UpdatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAddOrUpdate();

        // ── Soft-delete ──────────────────────────────────────
        builder.HasQueryFilter(p => p.DeletedAt == null);

        builder.HasIndex(p => p.DeletedAt)
            .HasDatabaseName("ix_projects_deleted_at");

        // ── FK: Заказчик (ClientProfile) ─────────────────────
        // NoAction — удаление профиля не удаляет проекты (защита данных)
        builder.HasOne(p => p.ClientProfile)
            .WithMany()
            .HasForeignKey(p => p.ClientProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.ClientProfileId)
            .HasDatabaseName("ix_projects_client_profile_id");

        // ── FK: Исполнитель (ExecutorProfile) — nullable ─────
        builder.HasOne(p => p.ExecutorProfile)
            .WithMany()
            .HasForeignKey(p => p.ExecutorProfileId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(p => p.ExecutorProfileId)
            .HasDatabaseName("ix_projects_executor_profile_id");
    }
}
