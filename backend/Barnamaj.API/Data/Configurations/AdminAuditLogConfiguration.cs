using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class AdminAuditLogConfiguration : IEntityTypeConfiguration<AdminAuditLog>
{
    public void Configure(EntityTypeBuilder<AdminAuditLog> b)
    {
        b.ToTable("admin_audit_logs");

        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");

        b.Property(x => x.Action)
            .IsRequired()
            .HasMaxLength(128);

        b.Property(x => x.Payload)
            .HasColumnType("jsonb");

        b.Property(x => x.IpAddress)
            .HasMaxLength(64);

        b.Property(x => x.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        b.HasIndex(x => x.AdminId)
            .HasDatabaseName("ix_audit_logs_admin_id");

        b.HasIndex(x => x.TargetUserId)
            .HasDatabaseName("ix_audit_logs_target_user_id");

        b.HasIndex(x => x.CreatedAt)
            .HasDatabaseName("ix_audit_logs_created_at");

        b.HasOne(x => x.Admin)
            .WithMany()
            .HasForeignKey(x => x.AdminId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
