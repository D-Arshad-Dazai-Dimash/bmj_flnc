using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class AssessmentAttemptConfiguration : IEntityTypeConfiguration<AssessmentAttempt>
{
    public void Configure(EntityTypeBuilder<AssessmentAttempt> builder)
    {
        builder.ToTable("assessment_attempts");

        // ── PK ───────────────────────────────────────────────
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // ── AnswersJson (PostgreSQL jsonb) ───────────────────
        builder.Property(a => a.AnswersJson)
            .IsRequired()
            .HasColumnType("jsonb")
            .HasColumnName("answers_json");

        // ── Score ────────────────────────────────────────────
        builder.Property(a => a.ScorePercent)
            .HasPrecision(5, 2);   // 999.99 max — достаточно для 0–100.00

        // ── Status ───────────────────────────────────────────
        builder.Property(a => a.Status)
            .HasConversion<byte>();

        // ── Timestamp ────────────────────────────────────────
        builder.Property(a => a.CompletedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        // ── FK → Profile ─────────────────────────────────────
        // Cascade: удаление профиля удаляет историю его тестов
        builder.HasOne(a => a.Profile)
            .WithMany()
            .HasForeignKey(a => a.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── FK → Skill ───────────────────────────────────────
        // Restrict: нельзя удалить навык, если есть попытки
        builder.HasOne(a => a.Skill)
            .WithMany(s => s.Attempts)
            .HasForeignKey(a => a.SkillId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── Indexes ──────────────────────────────────────────
        builder.HasIndex(a => new { a.ProfileId, a.SkillId })
            .HasDatabaseName("ix_attempts_profile_skill");

        builder.HasIndex(a => a.CompletedAt)
            .HasDatabaseName("ix_attempts_completed_at");
    }
}
