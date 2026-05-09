using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class KycSubmissionConfiguration : IEntityTypeConfiguration<KycSubmission>
{
    public void Configure(EntityTypeBuilder<KycSubmission> b)
    {
        b.ToTable("kyc_submissions");

        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        b.Property(x => x.Kind).HasConversion<byte>();
        b.Property(x => x.Status).HasConversion<byte>();
        b.Property(x => x.ResponsibleRole).HasConversion<byte?>();

        b.Property(x => x.LegalForm).HasMaxLength(8);
        b.Property(x => x.Bin).HasMaxLength(12);
        b.Property(x => x.LegalName).HasMaxLength(256);
        b.Property(x => x.LegalAddress).HasMaxLength(512);
        b.Property(x => x.ContactPhone).HasMaxLength(16);
        b.Property(x => x.ResponsibleName).HasMaxLength(256);

        b.Property(x => x.RegistrySnapshotJson).HasColumnType("jsonb");

        b.Property(x => x.AiDecision).HasMaxLength(16);
        b.Property(x => x.AiReasoning).HasMaxLength(1024);

        b.Property(x => x.RejectionReason).HasMaxLength(512);

        b.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAdd();
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAddOrUpdate();

        // Один активный submission на пользователя (Pending / AiApproved / AiRejected / ManualReview).
        // Approved (4) и Rejected (5) — финальные, могут существовать в истории.
        b.HasIndex(x => x.UserId)
            .HasDatabaseName("ux_kyc_submissions_user_active")
            .IsUnique()
            .HasFilter("status < 4");

        b.HasIndex(x => new { x.Status, x.CreatedAt })
            .HasDatabaseName("ix_kyc_submissions_status_created");

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
