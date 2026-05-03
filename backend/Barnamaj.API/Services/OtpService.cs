using System.Security.Cryptography;
using Microsoft.Extensions.Caching.Distributed;

namespace Barnamaj.API.Services;

/// <summary>
/// Генерация и проверка одноразовых кодов (OTP) для подтверждения телефона.
///
/// Хранение — в IDistributedCache (Redis в prod, in-memory в dev).
/// TTL: 5 минут. Лимиты: 1 код в минуту, 5 в час на номер.
/// </summary>
public interface IOtpService
{
    /// <summary>Сгенерировать и сохранить код. Возвращает сам код (для отправки в SMS).</summary>
    Task<string> IssueAsync(string phone, CancellationToken ct = default);

    /// <summary>Проверить код. true — успех (код удалён из стора).</summary>
    Task<bool> VerifyAsync(string phone, string code, CancellationToken ct = default);

    /// <summary>Сколько секунд ждать перед повторным запросом кода. 0 — можно сейчас.</summary>
    Task<int> SecondsUntilNextSendAsync(string phone, CancellationToken ct = default);
}

public sealed class OtpService : IOtpService
{
    private readonly IDistributedCache _cache;
    private static readonly TimeSpan CodeTtl       = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ResendCooldown = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan HourlyWindow   = TimeSpan.FromHours(1);
    private const int    HourlyLimit = 5;

    public OtpService(IDistributedCache cache) => _cache = cache;

    public async Task<string> IssueAsync(string phone, CancellationToken ct = default)
    {
        var hourlyKey = $"otp:hour:{phone}";
        var raw       = await _cache.GetStringAsync(hourlyKey, ct);
        var count     = int.TryParse(raw, out var c) ? c : 0;
        if (count >= HourlyLimit)
            throw new InvalidOperationException("Превышен лимит отправок в час. Попробуйте позже.");

        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        await _cache.SetStringAsync(
            $"otp:code:{phone}", code,
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = CodeTtl }, ct);
        await _cache.SetStringAsync(
            $"otp:cooldown:{phone}", "1",
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ResendCooldown }, ct);
        await _cache.SetStringAsync(
            hourlyKey, (count + 1).ToString(),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = HourlyWindow }, ct);

        return code;
    }

    public async Task<bool> VerifyAsync(string phone, string code, CancellationToken ct = default)
    {
        var stored = await _cache.GetStringAsync($"otp:code:{phone}", ct);
        if (stored is null || stored != code) return false;

        await _cache.RemoveAsync($"otp:code:{phone}", ct);
        return true;
    }

    public async Task<int> SecondsUntilNextSendAsync(string phone, CancellationToken ct = default)
    {
        var raw = await _cache.GetStringAsync($"otp:cooldown:{phone}", ct);
        // Cooldown существует — нельзя; точное время не известно (Redis sliding TTL не возвращается),
        // но факта существования достаточно. Возвращаем 60 как верхнюю границу.
        return raw is null ? 0 : 60;
    }
}
