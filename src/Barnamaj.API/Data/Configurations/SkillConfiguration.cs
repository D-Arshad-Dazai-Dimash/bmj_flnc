using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class SkillConfiguration : IEntityTypeConfiguration<Skill>
{
    public void Configure(EntityTypeBuilder<Skill> builder)
    {
        builder.ToTable("skills");

        // ── PK ───────────────────────────────────────────────
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // ── Name ─────────────────────────────────────────────
        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(128);

        builder.HasIndex(s => s.Name)
            .IsUnique()
            .HasDatabaseName("uq_skills_name");

        // ── Description / Category ───────────────────────────
        builder.Property(s => s.Description)
            .HasMaxLength(2000);

        builder.Property(s => s.Category)
            .HasMaxLength(64);

        // ── Timestamp ────────────────────────────────────────
        builder.Property(s => s.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        // ── Query filter: только активные ────────────────────
        builder.HasQueryFilter(s => s.IsActive);
    }
}
