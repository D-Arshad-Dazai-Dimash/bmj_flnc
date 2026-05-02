using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

/// <summary>
/// Fluent API конфигурация таблицы project_applications.
/// </summary>
public class ProjectApplicationConfiguration : IEntityTypeConfiguration<ProjectApplication>
{
    public void Configure(EntityTypeBuilder<ProjectApplication> builder)
    {
        builder.ToTable("project_applications");

        // ── PK ───────────────────────────────────────────────
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // ── CoverLetter ──────────────────────────────────────
        builder.Property(a => a.CoverLetter)
            .HasMaxLength(5000);

        // ── ProposedBudget ───────────────────────────────────
        builder.Property(a => a.ProposedBudget)
            .HasPrecision(18, 2)
            .IsRequired(false);

        // ── Status ───────────────────────────────────────────
        builder.Property(a => a.Status)
            .HasConversion<byte>();

        // ── CreatedAt ────────────────────────────────────────
        builder.Property(a => a.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        // ── Уникальность: один профиль — одна заявка на проект ─
        builder.HasIndex(a => new { a.ProjectId, a.ApplicantProfileId })
            .IsUnique()
            .HasDatabaseName("ix_project_applications_project_applicant_unique");

        // ── FK: Проект ───────────────────────────────────────
        builder.HasOne(a => a.Project)
            .WithMany(p => p.Applications)
            .HasForeignKey(a => a.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── FK: Претендент ───────────────────────────────────
        builder.HasOne(a => a.ApplicantProfile)
            .WithMany()
            .HasForeignKey(a => a.ApplicantProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => new { a.ProjectId, a.Status })
            .HasDatabaseName("ix_project_applications_project_status");
    }
}
