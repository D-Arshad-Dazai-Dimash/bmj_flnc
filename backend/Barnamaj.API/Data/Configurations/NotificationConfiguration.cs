using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.ToTable("notifications");
        b.HasKey(n => n.Id);
        b.Property(n => n.Id).HasDefaultValueSql("gen_random_uuid()");

        b.Property(n => n.Type).IsRequired().HasMaxLength(64);
        b.Property(n => n.Title).IsRequired().HasMaxLength(256);
        b.Property(n => n.PayloadJson).HasColumnType("jsonb");
        b.Property(n => n.CreatedAt).HasDefaultValueSql("NOW()");

        b.HasIndex(n => new { n.UserId, n.CreatedAt }).IsDescending(false, true);
        b.HasIndex(n => new { n.UserId, n.IsRead });
    }
}
