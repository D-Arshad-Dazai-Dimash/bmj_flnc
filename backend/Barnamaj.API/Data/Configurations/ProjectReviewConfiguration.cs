using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class ProjectReviewConfiguration : IEntityTypeConfiguration<ProjectReview>
{
    public void Configure(EntityTypeBuilder<ProjectReview> b)
    {
        b.ToTable("project_reviews");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        b.Property(x => x.Direction).HasConversion<byte>();
        b.Property(x => x.Stars);   // tinyint, проверяется в сервисе (1..5)

        b.Property(x => x.Comment).HasMaxLength(2000);
        b.Property(x => x.TagsJson).HasColumnType("jsonb");
        b.Property(x => x.HiddenReason).HasMaxLength(500);

        b.Property(x => x.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();
        b.Property(x => x.UpdatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAddOrUpdate();

        // ── FK ────────────────────────────────────────────
        b.HasOne(x => x.Project)
            .WithMany()
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.AuthorUser)
            .WithMany()
            .HasForeignKey(x => x.AuthorUserId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.AuthorProfile)
            .WithMany()
            .HasForeignKey(x => x.AuthorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.TargetProfile)
            .WithMany()
            .HasForeignKey(x => x.TargetProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── Индексы ───────────────────────────────────────
        // Один отзыв на (проект, направление).
        b.HasIndex(x => new { x.ProjectId, x.Direction })
            .IsUnique()
            .HasDatabaseName("ux_project_reviews_project_direction");

        // Лента отзывов о цели (для GET /profiles/{id}/reviews).
        b.HasIndex(x => new { x.TargetProfileId, x.IsHidden, x.CreatedAt })
            .HasDatabaseName("ix_project_reviews_target");
    }
}
