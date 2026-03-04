using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class ProfileSkillBadgeConfiguration : IEntityTypeConfiguration<ProfileSkillBadge>
{
    public void Configure(EntityTypeBuilder<ProfileSkillBadge> builder)
    {
        builder.ToTable("profile_skill_badges");

        // ── Составной PK (ProfileId + SkillId) ───────────────
        // Один бейдж на пару профиль+навык — уникальность на уровне PK
        builder.HasKey(b => new { b.ProfileId, b.SkillId });

        // ── BestScore ─────────────────────────────────────────
        builder.Property(b => b.BestScore)
            .HasPrecision(5, 2);   // 0.00 – 100.00

        // ── Timestamps ───────────────────────────────────────
        builder.Property(b => b.AchievedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        builder.Property(b => b.UpdatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAddOrUpdate();

        // ── FK → Profile ─────────────────────────────────────
        builder.HasOne(b => b.Profile)
            .WithMany(p => p.SkillBadges)
            .HasForeignKey(b => b.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);  // удаление профиля = удаление бейджей

        // ── FK → Skill ───────────────────────────────────────
        builder.HasOne(b => b.Skill)
            .WithMany(s => s.Badges)
            .HasForeignKey(b => b.SkillId)
            .OnDelete(DeleteBehavior.Restrict);  // нельзя удалить навык с бейджами

        // ── Index ────────────────────────────────────────────
        builder.HasIndex(b => b.BestScore)
            .HasDatabaseName("ix_badges_best_score");
    }
}
