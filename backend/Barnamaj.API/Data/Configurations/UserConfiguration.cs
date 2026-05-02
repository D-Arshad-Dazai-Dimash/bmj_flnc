using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

/// <summary>
/// Fluent API конфигурация таблицы users.
/// Применяется автоматически через ApplyConfigurationsFromAssembly.
/// </summary>
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        // ── PK ───────────────────────────────────────────────
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // ── Email ────────────────────────────────────────────
        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(u => u.Email)
            .IsUnique()
            .HasDatabaseName("ix_users_email");

        // ── PasswordHash ─────────────────────────────────────
        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasMaxLength(512);

        // ── Role ─────────────────────────────────────────────
        // HasDefaultValue не нужен: Role = UserRole.Member уже задан в сущности
        builder.Property(u => u.Role)
            .HasConversion<byte>();

        builder.HasIndex(u => u.Role)
            .HasDatabaseName("ix_users_role");

        // ── Флаги ────────────────────────────────────────────
        builder.Property(u => u.IsActive)
            .HasDefaultValue(true);

        builder.Property(u => u.IsEmailVerified)
            .HasDefaultValue(false);

        // ── Временные метки ──────────────────────────────────
        builder.Property(u => u.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        builder.Property(u => u.UpdatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAddOrUpdate();

        // ── Soft-delete: активные пользователи ───────────────
        builder.HasQueryFilter(u => u.DeletedAt == null);

        builder.HasIndex(u => new { u.IsActive, u.DeletedAt })
            .HasDatabaseName("ix_users_active_not_deleted")
            .HasFilter("deleted_at IS NULL AND is_active = true");

        // ── Связь 1:1 User → Profile (собственный профиль) ───
        // Без обратной навигации (WithOne()) — простейшая конфигурация
        builder.HasOne(u => u.Profile)
            .WithOne()
            .HasForeignKey<User>(u => u.ProfileId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
