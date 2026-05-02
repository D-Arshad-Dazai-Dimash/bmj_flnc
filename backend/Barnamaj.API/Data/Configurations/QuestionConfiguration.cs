using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> builder)
    {
        builder.ToTable("questions");

        // ── PK ───────────────────────────────────────────────
        builder.HasKey(q => q.Id);
        builder.Property(q => q.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // ── Text ─────────────────────────────────────────────
        builder.Property(q => q.Text)
            .IsRequired()
            .HasMaxLength(2000);

        // ── OptionsJson (PostgreSQL jsonb) ───────────────────
        // Хранит ["Option A", "Option B", ...] без маппинга ORM
        builder.Property(q => q.OptionsJson)
            .IsRequired()
            .HasColumnType("jsonb")
            .HasColumnName("options_json");

        // ── CorrectAnswerIndex ───────────────────────────────
        builder.Property(q => q.CorrectAnswerIndex)
            .HasColumnName("correct_answer_index");

        // ── Difficulty ───────────────────────────────────────
        builder.Property(q => q.Difficulty)
            .HasConversion<byte>();

        // ── Timestamp ────────────────────────────────────────
        builder.Property(q => q.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        // ── FK → Skill ───────────────────────────────────────
        builder.HasOne(q => q.Skill)
            .WithMany(s => s.Questions)
            .HasForeignKey(q => q.SkillId)
            .OnDelete(DeleteBehavior.Cascade);  // Удаление навыка = удаление вопросов

        // ── Index ────────────────────────────────────────────
        builder.HasIndex(q => new { q.SkillId, q.IsActive })
            .HasDatabaseName("ix_questions_skill_active");
    }
}
