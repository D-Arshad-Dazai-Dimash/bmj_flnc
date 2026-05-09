using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

/// <summary>
/// Fluent API конфигурация таблицы profiles.
/// </summary>
public class ProfileConfiguration : IEntityTypeConfiguration<Profile>
{
    public void Configure(EntityTypeBuilder<Profile> builder)
    {
        builder.ToTable("profiles");

        // ── PK ───────────────────────────────────────────────
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // ── Name ─────────────────────────────────────────────
        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(p => p.Name)
            .HasDatabaseName("ix_profiles_name");

        // ── Bio ──────────────────────────────────────────────
        builder.Property(p => p.Bio)
            .HasMaxLength(2000);

        // ── LogoUrl ──────────────────────────────────────────
        builder.Property(p => p.LogoUrl)
            .HasMaxLength(2048);

        // ── Социальный вид: обложка / статус / закрепы ───────
        builder.Property(p => p.CoverPresetId)
            .HasDefaultValue(0);
        builder.Property(p => p.Status)
            .HasMaxLength(80);
        builder.Property(p => p.PinnedProjectIdsJson)
            .HasColumnType("text");

        // ── AccountType ──────────────────────────────────────
        // HasDefaultValue не нужен: AccountType.Individual задан в сущности
        builder.Property(p => p.AccountType)
            .HasConversion<byte>();

        builder.HasIndex(p => p.AccountType)
            .HasDatabaseName("ix_profiles_account_type");

        // ── IsVerified ───────────────────────────────────────
        builder.Property(p => p.IsVerified)
            .HasDefaultValue(false);

        // ── Рейтинг (денормализация) ─────────────────────────
        builder.Property(p => p.AvgRating)
            .HasColumnType("numeric(3,2)");
        builder.Property(p => p.RatingsCount)
            .HasDefaultValue(0);

        // ── Временные метки ──────────────────────────────────
        builder.Property(p => p.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        builder.Property(p => p.UpdatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAddOrUpdate();

        // ── Soft-delete + Индекс активных профилей ───────────
        builder.HasQueryFilter(p => p.DeletedAt == null);

        builder.HasIndex(p => new { p.AccountType, p.DeletedAt })
            .HasDatabaseName("ix_profiles_type_not_deleted")
            .HasFilter("deleted_at IS NULL");

        // ── Связь 1:1 с User (обратная сторона) ─────────────
        // Определяется через UserConfiguration
    }
}
