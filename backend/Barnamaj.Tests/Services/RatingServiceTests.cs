using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Reviews;
using Barnamaj.API.Entities;
using Barnamaj.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Barnamaj.Tests.Services;

/// <summary>
/// Тесты <see cref="RatingService"/> на InMemory EF.
///
/// Покрытие: разрешение сторон по проекту, валидация (stars/comment/state),
/// уникальность (один отзыв на направление), пересчёт <c>AvgRating</c> с
/// учётом скрытия модератором.
/// </summary>
public class RatingServiceTests
{
    private static AppDbContext NewDb([System.Runtime.CompilerServices.CallerMemberName] string name = "")
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"ratings_{name}_{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(opts);
    }

    private static (AppDbContext db, IRatingService svc, Project project, Guid clientUserId, Guid execUserId)
        SeedCompletedProject()
    {
        var db = NewDb();

        // Профили
        var clientProfile = new Profile { Id = Guid.NewGuid(), Name = "Client",  AccountType = AccountType.Individual };
        var execProfile   = new Profile { Id = Guid.NewGuid(), Name = "Exec",    AccountType = AccountType.Individual };

        // Пользователи
        var clientUser = new User { Id = Guid.NewGuid(), Email = "c@x.kz", PasswordHash = "x", ProfileId = clientProfile.Id };
        var execUser   = new User { Id = Guid.NewGuid(), Email = "e@x.kz", PasswordHash = "x", ProfileId = execProfile.Id };

        var project = new Project
        {
            Id                = Guid.NewGuid(),
            Title             = "Test",
            Status            = ProjectStatus.Completed,
            ClientProfileId   = clientProfile.Id,
            ExecutorProfileId = execProfile.Id,
        };

        db.Profiles.AddRange(clientProfile, execProfile);
        db.Users.AddRange(clientUser, execUser);
        db.Projects.Add(project);
        db.SaveChanges();

        var svc = new RatingService(db, NullLogger<RatingService>.Instance);
        return (db, svc, project, clientUser.Id, execUser.Id);
    }

    // ── Создание ───────────────────────────────────────────────

    [Fact]
    public async Task Create_Client_Rates_Executor_Updates_Profile_AvgRating()
    {
        var (db, svc, project, clientUserId, _) = SeedCompletedProject();

        var dto = new CreateReviewDto(5, "Отличная работа", new[] { "Качество", "Сроки" });
        var r = await svc.CreateAsync(project.Id, clientUserId, dto, default);

        Assert.Equal("ClientToExecutor", r.Direction);
        Assert.Equal((byte)5, r.Stars);
        Assert.Contains("Качество", r.Tags);

        var execProfile = await db.Profiles.FirstAsync(p => p.Id == project.ExecutorProfileId);
        Assert.Equal(5.00m, execProfile.AvgRating);
        Assert.Equal(1, execProfile.RatingsCount);
    }

    [Fact]
    public async Task Create_Executor_Rates_Client_Independently()
    {
        var (db, svc, project, clientUserId, execUserId) = SeedCompletedProject();

        await svc.CreateAsync(project.Id, clientUserId, new CreateReviewDto(4, null, null), default);
        var r = await svc.CreateAsync(project.Id, execUserId, new CreateReviewDto(3, "ок", null), default);

        Assert.Equal("ExecutorToClient", r.Direction);
        // Оба отзыва должны существовать (на одно направление каждый).
        Assert.Equal(2, await db.ProjectReviews.CountAsync());
    }

    [Fact]
    public async Task Create_Twice_Same_Direction_Is_Forbidden()
    {
        var (_, svc, project, clientUserId, _) = SeedCompletedProject();
        await svc.CreateAsync(project.Id, clientUserId, new CreateReviewDto(5, null, null), default);

        var ex = await Assert.ThrowsAsync<RatingException>(() =>
            svc.CreateAsync(project.Id, clientUserId, new CreateReviewDto(4, null, null), default));
        Assert.Equal("review_exists", ex.Code);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public async Task Create_Invalid_Stars_Rejected(byte stars)
    {
        var (_, svc, project, clientUserId, _) = SeedCompletedProject();
        var ex = await Assert.ThrowsAsync<RatingException>(() =>
            svc.CreateAsync(project.Id, clientUserId, new CreateReviewDto(stars, null, null), default));
        Assert.Equal("invalid_stars", ex.Code);
    }

    [Fact]
    public async Task Create_For_Non_Completed_Project_Forbidden()
    {
        var (db, svc, project, clientUserId, _) = SeedCompletedProject();
        project.Status = ProjectStatus.InProgress;
        db.SaveChanges();

        var ex = await Assert.ThrowsAsync<RatingException>(() =>
            svc.CreateAsync(project.Id, clientUserId, new CreateReviewDto(5, null, null), default));
        Assert.Equal("project_not_completed", ex.Code);
    }

    [Fact]
    public async Task Create_By_Stranger_Forbidden()
    {
        var (_, svc, project, _, _) = SeedCompletedProject();
        var stranger = Guid.NewGuid();
        var ex = await Assert.ThrowsAsync<RatingException>(() =>
            svc.CreateAsync(project.Id, stranger, new CreateReviewDto(5, null, null), default));
        Assert.Equal("not_a_party", ex.Code);
    }

    [Fact]
    public async Task Create_Tags_Filtered_To_Allowed()
    {
        var (_, svc, project, clientUserId, _) = SeedCompletedProject();
        var r = await svc.CreateAsync(project.Id, clientUserId,
            new CreateReviewDto(5, null, new[] { "Качество", "несуществующий-тег", "Сроки", "Качество" }), default);

        Assert.Equal(2, r.Tags.Count); // "Качество" дедуплицирован, левый отброшен
        Assert.Contains("Качество", r.Tags);
        Assert.Contains("Сроки",    r.Tags);
    }

    // ── Модерация ──────────────────────────────────────────────

    [Fact]
    public async Task Hide_Then_Restore_Updates_Average()
    {
        var (db, svc, project, clientUserId, _) = SeedCompletedProject();
        var r1 = await svc.CreateAsync(project.Id, clientUserId, new CreateReviewDto(5, null, null), default);

        var execProfileId = project.ExecutorProfileId!.Value;

        await svc.HideAsync(r1.Id, Guid.NewGuid(), "спам и оскорбления", default);
        var p1 = await db.Profiles.FirstAsync(p => p.Id == execProfileId);
        Assert.Null(p1.AvgRating);
        Assert.Equal(0, p1.RatingsCount);

        await svc.RestoreAsync(r1.Id, Guid.NewGuid(), default);
        var p2 = await db.Profiles.FirstAsync(p => p.Id == execProfileId);
        Assert.Equal(5.00m, p2.AvgRating);
        Assert.Equal(1, p2.RatingsCount);
    }

    [Fact]
    public async Task Hide_Invalid_Reason_Rejected()
    {
        var (_, svc, project, clientUserId, _) = SeedCompletedProject();
        var r1 = await svc.CreateAsync(project.Id, clientUserId, new CreateReviewDto(5, null, null), default);

        var ex = await Assert.ThrowsAsync<RatingException>(() =>
            svc.HideAsync(r1.Id, Guid.NewGuid(), "x", default));
        Assert.Equal("invalid_reason", ex.Code);
    }

    // ── Чтение ─────────────────────────────────────────────────

    [Fact]
    public async Task Summary_Contains_Breakdown_For_All_Stars()
    {
        var (db, svc, project, clientUserId, _) = SeedCompletedProject();
        await svc.CreateAsync(project.Id, clientUserId, new CreateReviewDto(4, null, null), default);

        var s = await svc.GetSummaryAsync(project.ExecutorProfileId!.Value, default);
        Assert.Equal(1, s.RatingsCount);
        Assert.Equal(4.00m, s.AvgRating);
        Assert.Equal(1, s.Breakdown["4"]);
        Assert.Equal(0, s.Breakdown["5"]);
    }

    [Fact]
    public async Task ForProfile_Excludes_Hidden_Reviews()
    {
        var (db, svc, project, clientUserId, execUserId) = SeedCompletedProject();
        var r1 = await svc.CreateAsync(project.Id, clientUserId, new CreateReviewDto(5, null, null), default);
        await svc.HideAsync(r1.Id, Guid.NewGuid(), "тест-причина", default);

        var p = await svc.GetForProfileAsync(project.ExecutorProfileId!.Value, 1, 10, default);
        Assert.Equal(0, p.Total);
        Assert.Empty(p.Items);
    }
}
