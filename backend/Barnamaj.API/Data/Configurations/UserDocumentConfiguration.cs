using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class UserDocumentConfiguration : IEntityTypeConfiguration<UserDocument>
{
    public void Configure(EntityTypeBuilder<UserDocument> b)
    {
        b.ToTable("user_documents");

        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        b.Property(x => x.DocumentType).HasConversion<byte>();
        b.Property(x => x.Status).HasConversion<byte>();

        b.Property(x => x.FrontObjectKey).IsRequired().HasMaxLength(512);
        b.Property(x => x.BackObjectKey).HasMaxLength(512);
        b.Property(x => x.SelfieObjectKey).IsRequired().HasMaxLength(512);
        b.Property(x => x.FrontSha256).IsRequired().HasMaxLength(64);
        b.Property(x => x.RejectionReason).HasMaxLength(512);

        b.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAdd();
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAddOrUpdate();

        // Один активный (не Rejected) документ ОДНОГО ТИПА на пользователя.
        // Для legal-KYC нужно несколько разных DocumentType одновременно
        // (ResponsiblePersonId + AuthorityDocument + CompanyRegistration), поэтому
        // ключ уникальности расширен типом документа.
        b.HasIndex(x => new { x.UserId, x.DocumentType })
            .HasDatabaseName("ux_user_documents_user_type_active")
            .IsUnique()
            .HasFilter("status <> 3"); // 3 = Rejected

        // Дубликаты файлов (защита от reuse чужого документа)
        b.HasIndex(x => x.FrontSha256)
            .HasDatabaseName("ix_user_documents_front_sha");

        b.HasIndex(x => x.SubmissionId)
            .HasDatabaseName("ix_user_documents_submission");

        b.HasOne(x => x.User)
            .WithMany(u => u.Documents)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.Submission)
            .WithMany(s => s.Documents)
            .HasForeignKey(x => x.SubmissionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
