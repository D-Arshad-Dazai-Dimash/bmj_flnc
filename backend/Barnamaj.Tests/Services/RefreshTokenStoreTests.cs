using Barnamaj.API.Data;
using Barnamaj.API.Entities;
using Barnamaj.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Barnamaj.Tests.Services;

/// <summary>
/// Тесты RefreshTokenStore: rotation, reuse-detection, revocation.
/// Покрывает best practice OAuth2 (RFC 6819 §5.2.2.3).
/// </summary>
public class RefreshTokenStoreTests
{
    private static AppDbContext NewDb([System.Runtime.CompilerServices.CallerMemberName] string name = "")
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"refresh_{name}_{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(opts);
    }

    private static (AppDbContext db, IRefreshTokenStore store, Guid userId) Seed()
    {
        var db = NewDb();
        var profile = new Profile { Id = Guid.NewGuid(), Name = "U", AccountType = AccountType.Individual };
        var user = new User { Id = Guid.NewGuid(), Email = "u@x.kz", PasswordHash = "x", ProfileId = profile.Id };
        db.Profiles.Add(profile);
        db.Users.Add(user);
        db.SaveChanges();

        var store = new RefreshTokenStore(db, NullLogger<RefreshTokenStore>.Instance);
        return (db, store, user.Id);
    }

    [Fact]
    public async Task IssueAsync_StoresHashedToken_NotRawToken()
    {
        var (db, store, userId) = Seed();
        var jti = Guid.NewGuid();
        var familyId = Guid.NewGuid();
        const string token = "raw.jwt.token";

        await store.IssueAsync(jti, userId, familyId, token, DateTime.UtcNow.AddDays(30), null, null);

        var record = await db.RefreshTokens.FirstAsync(x => x.Id == jti);
        Assert.NotEqual(token, record.TokenHash);
        Assert.Equal(IRefreshTokenStore.ComputeHash(token), record.TokenHash);
    }

    [Fact]
    public async Task ValidateAsync_ValidToken_ReturnsValid()
    {
        var (_, store, userId) = Seed();
        var jti = Guid.NewGuid();
        var familyId = Guid.NewGuid();
        const string token = "good.token";

        await store.IssueAsync(jti, userId, familyId, token, DateTime.UtcNow.AddDays(30), null, null);
        var (result, returnedFamily) = await store.ValidateAsync(jti, token);

        Assert.Equal(RefreshValidationResult.Valid, result);
        Assert.Equal(familyId, returnedFamily);
    }

    [Fact]
    public async Task ValidateAsync_UnknownJti_ReturnsNotFound()
    {
        var (_, store, _) = Seed();
        var (result, _) = await store.ValidateAsync(Guid.NewGuid(), "any");
        Assert.Equal(RefreshValidationResult.NotFound, result);
    }

    [Fact]
    public async Task ValidateAsync_HashMismatch_ReturnsNotFound()
    {
        var (_, store, userId) = Seed();
        var jti = Guid.NewGuid();
        await store.IssueAsync(jti, userId, Guid.NewGuid(), "real.token", DateTime.UtcNow.AddDays(30), null, null);

        var (result, _) = await store.ValidateAsync(jti, "different.token");
        Assert.Equal(RefreshValidationResult.NotFound, result);
    }

    [Fact]
    public async Task ValidateAsync_ExpiredToken_ReturnsExpired()
    {
        var (_, store, userId) = Seed();
        var jti = Guid.NewGuid();
        const string token = "old.token";
        await store.IssueAsync(jti, userId, Guid.NewGuid(), token, DateTime.UtcNow.AddSeconds(-1), null, null);

        var (result, _) = await store.ValidateAsync(jti, token);
        Assert.Equal(RefreshValidationResult.Expired, result);
    }

    [Fact]
    public async Task MarkRotatedAsync_SetsRevokedAndReplacedBy()
    {
        var (db, store, userId) = Seed();
        var oldJti = Guid.NewGuid();
        var newJti = Guid.NewGuid();
        await store.IssueAsync(oldJti, userId, Guid.NewGuid(), "t", DateTime.UtcNow.AddDays(30), null, null);

        await store.MarkRotatedAsync(oldJti, newJti);

        var record = await db.RefreshTokens.FirstAsync(x => x.Id == oldJti);
        Assert.NotNull(record.RevokedAt);
        Assert.Equal("rotated", record.RevokedReason);
        Assert.Equal(newJti, record.ReplacedByJti);
    }

    [Fact]
    public async Task ValidateAsync_RotatedToken_TriggersReuseDetection_RevokesFamily()
    {
        var (db, store, userId) = Seed();
        var familyId = Guid.NewGuid();
        var jti1 = Guid.NewGuid();
        var jti2 = Guid.NewGuid();
        var jti3 = Guid.NewGuid();
        const string token1 = "t1";
        const string token2 = "t2";
        const string token3 = "t3";

        // Семья из 3 токенов
        await store.IssueAsync(jti1, userId, familyId, token1, DateTime.UtcNow.AddDays(30), null, null);
        await store.IssueAsync(jti2, userId, familyId, token2, DateTime.UtcNow.AddDays(30), null, null);
        await store.IssueAsync(jti3, userId, familyId, token3, DateTime.UtcNow.AddDays(30), null, null);

        // jti1 был rotated в jti2
        await store.MarkRotatedAsync(jti1, jti2);

        // Reuse: кто-то прислал старый jti1
        var (result, returnedFamily) = await store.ValidateAsync(jti1, token1);

        Assert.Equal(RefreshValidationResult.ReuseDetected, result);
        Assert.Equal(familyId, returnedFamily);

        // ВСЕ активные токены family должны быть revoked
        var active = await db.RefreshTokens.Where(x => x.FamilyId == familyId && x.RevokedAt == null).CountAsync();
        Assert.Equal(0, active);
    }

    [Fact]
    public async Task RevokeAsync_LogoutReason_MarksRevoked()
    {
        var (db, store, userId) = Seed();
        var jti = Guid.NewGuid();
        await store.IssueAsync(jti, userId, Guid.NewGuid(), "t", DateTime.UtcNow.AddDays(30), null, null);

        await store.RevokeAsync(jti, "logout");

        var record = await db.RefreshTokens.FirstAsync(x => x.Id == jti);
        Assert.NotNull(record.RevokedAt);
        Assert.Equal("logout", record.RevokedReason);
    }

    [Fact]
    public async Task RevokeAllForUserAsync_RevokesAllUserTokens_ButNotOthers()
    {
        var (db, store, userId) = Seed();

        // Добавим второго пользователя
        var profile2 = new Profile { Id = Guid.NewGuid(), Name = "U2", AccountType = AccountType.Individual };
        var user2 = new User { Id = Guid.NewGuid(), Email = "u2@x.kz", PasswordHash = "x", ProfileId = profile2.Id };
        db.Profiles.Add(profile2);
        db.Users.Add(user2);
        await db.SaveChangesAsync();

        var jtiA = Guid.NewGuid();
        var jtiB = Guid.NewGuid();
        var jtiOther = Guid.NewGuid();
        await store.IssueAsync(jtiA, userId, Guid.NewGuid(), "a", DateTime.UtcNow.AddDays(30), null, null);
        await store.IssueAsync(jtiB, userId, Guid.NewGuid(), "b", DateTime.UtcNow.AddDays(30), null, null);
        await store.IssueAsync(jtiOther, user2.Id, Guid.NewGuid(), "c", DateTime.UtcNow.AddDays(30), null, null);

        await store.RevokeAllForUserAsync(userId, "force_logout");

        var active = await db.RefreshTokens.Where(x => x.RevokedAt == null).Select(x => x.Id).ToListAsync();
        Assert.Single(active);
        Assert.Contains(jtiOther, active);
    }
}
