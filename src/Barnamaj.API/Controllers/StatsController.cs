using Barnamaj.API.Data;
using Barnamaj.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Публичная статистика платформы.
///
/// GET /api/stats — реальные счётчики из БД с кэшированием 60 секунд.
/// </summary>
[ApiController]
[Route("api/stats")]
public sealed class StatsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;
    private const string CacheKey = "platform-stats";

    public StatsController(AppDbContext db, IMemoryCache cache)
    {
        _db    = db;
        _cache = cache;
    }

    /// <summary>
    /// Возвращает агрегированную статистику платформы.
    /// Кэшируется на 60 секунд.
    /// </summary>
    [HttpGet]
    [ResponseCache(Duration = 60)]
    [ProducesResponseType(typeof(PlatformStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        if (_cache.TryGetValue(CacheKey, out PlatformStatsDto? cached) && cached is not null)
            return Ok(cached);

        // EF Core DbContext не поддерживает параллельные операции на одном экземпляре.
        var users = await _db.Users.AsNoTracking().CountAsync(ct);
        var activeOrders = await _db.Projects.AsNoTracking()
            .CountAsync(p => p.Status == ProjectStatus.Open || p.Status == ProjectStatus.InProgress, ct);
        var completedOrders = await _db.Projects.AsNoTracking()
            .CountAsync(p => p.Status == ProjectStatus.Completed, ct);
        var clans = await _db.Profiles.AsNoTracking()
            .CountAsync(p => p.AccountType == AccountType.Clan, ct);
        var companies = await _db.Profiles.AsNoTracking()
            .CountAsync(p => p.AccountType == AccountType.Company, ct);

        var stats = new PlatformStatsDto(
            Users:           users,
            ActiveOrders:    activeOrders,
            CompletedOrders: completedOrders,
            Clans:           clans,
            Companies:       companies
        );

        _cache.Set(CacheKey, stats, TimeSpan.FromSeconds(60));

        return Ok(stats);
    }
}

/// <summary>Агрегированная статистика платформы.</summary>
public record PlatformStatsDto(
    int Users,
    int ActiveOrders,
    int CompletedOrders,
    int Clans,
    int Companies
);
