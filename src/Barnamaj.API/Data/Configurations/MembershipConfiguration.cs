using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

/// <summary>
/// Fluent API конфигурация таблицы memberships.
/// Реализует расширенную join-таблицу Many-to-Many: User ↔ Profile (Clan/Company).
/// </summary>
public class MembershipConfiguration : IEntityTypeConfiguration<Membership>
{
    public void Configure(EntityTypeBuilder<Membership> builder)
    {
        builder.ToTable("memberships");

        // ── PK ───────────────────────────────────────────────
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // ── Уникальность: один пользователь — один раз в группе ─
        builder.HasIndex(m => new { m.UserId, m.ProfileId })
            .IsUnique()
            .HasDatabaseName("ix_memberships_user_profile_unique");

        // ── RoleInGroup ──────────────────────────────────────
        builder.Property(m => m.RoleInGroup)
            .HasConversion<byte>();

        // ── Status ───────────────────────────────────────────
        // Pending=0 (дефолт), Active=1, Rejected=2, Left=3, Kicked=4
        builder.Property(m => m.Status)
            .HasConversion<byte>();

        // ── CreatedAt ─────────────────────────────────────────
        builder.Property(m => m.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        // ── JoinedAt ─────────────────────────────────────────
        builder.Property(m => m.JoinedAt)
            .IsRequired(false);

        // ── InvitedByUserId ───────────────────────────────────
        builder.Property(m => m.InvitedByUserId)
            .IsRequired(false);

        // Индекс: быстрая выборка активных/ожидающих членств пользователя
        builder.HasIndex(m => new { m.UserId, m.Status })
            .HasDatabaseName("ix_memberships_user_status");

        // ── Связь: Membership → User ─────────────────────────
        builder.HasOne(m => m.User)
            .WithMany(u => u.Memberships)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Связь: Membership → Profile (Clan/Company) ───────
        builder.HasOne(m => m.Profile)
            .WithMany(p => p.Memberships)
            .HasForeignKey(m => m.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
