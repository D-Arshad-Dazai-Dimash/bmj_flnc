using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Data;

/// <summary>
/// Основной контекст базы данных Barnamaj.
///
/// Таблицы:
///   users                 — аккаунты (аутентификация)
///   profiles              — публичные профили (Individual / Company / Clan)
///   memberships           — участие пользователей в кланах и компаниях (M:M)
///   projects              — проекты / технические задания
///   project_applications  — заявки исполнителей на проекты
///   skills                — навыки / специализации
///   questions             — вопросы тестов по навыкам
///   assessment_attempts   — история прохождения тестов
///   profile_skill_badges  — бейджи верифицированных навыков на профиле
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ── Таблицы БД ──────────────────────────────────────────
    public DbSet<User>               Users               => Set<User>();
    public DbSet<Profile>            Profiles            => Set<Profile>();
    public DbSet<Membership>         Memberships         => Set<Membership>();
    public DbSet<Project>            Projects            => Set<Project>();
    public DbSet<ProjectApplication> ProjectApplications => Set<ProjectApplication>();

    // ── Skills & Assessments ────────────────────────────────
    public DbSet<Skill>              Skills              => Set<Skill>();
    public DbSet<Question>           Questions           => Set<Question>();
    public DbSet<AssessmentAttempt>  AssessmentAttempts  => Set<AssessmentAttempt>();
    public DbSet<ProfileSkillBadge>  ProfileSkillBadges  => Set<ProfileSkillBadge>();

    // ── KYC ─────────────────────────────────────────────────
    public DbSet<KycEvent>           KycEvents           => Set<KycEvent>();

    // ── Контракты и эскроу ──────────────────────────────────
    public DbSet<Contract>           Contracts           => Set<Contract>();
    public DbSet<Payment>            Payments            => Set<Payment>();

    // ── Realtime ────────────────────────────────────────────
    public DbSet<Notification>       Notifications       => Set<Notification>();
    public DbSet<ChatMessage>        ChatMessages        => Set<ChatMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Применить все IEntityTypeConfiguration<T> из текущей сборки
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured) return;

        if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
        {
            optionsBuilder.EnableSensitiveDataLogging(false);
            optionsBuilder.EnableDetailedErrors();
        }
    }
}
