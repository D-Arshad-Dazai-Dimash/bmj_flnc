using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Distributed;

namespace Barnamaj.API.Services;

/// <summary>
/// OTP-сервис на Redis (через IDistributedCache).
///
/// Свойства:
///   - Код 6 цифр (RandomNumberGenerator).
///   - В кеше хранится HMAC(code), а не plaintext — защита от компрометации Redis.
///   - Constant-time сравнение.
///   - Brute-force lockout: после MaxAttempts неуспешных попыток — блокировка
///     этой destination (phone/email) на LockoutDuration. Кроме этого, действует
///     rate-limit на отправку: не чаще 1 кода в SendCooldown.
///   - TTL кода: CodeLifetime (по умолчанию 5 минут).
///   - Подтверждение удаляет код (одноразовый).
/// </summary>
public interface IOtpService
{
    /// <summary>Выпустить код. Возвращает plaintext-код для немедленной отправки SMS/email.
    /// Бросает <see cref="OtpThrottleException"/> при превышении лимита отправок.</summary>
    Task<string> IssueAsync(string destination, CancellationToken ct = default);

    /// <summary>Проверить код. Удаляет запись при успехе. Инкрементирует счётчик неудач.</summary>
    Task<bool> VerifyAsync(string destination, string code, CancellationToken ct = default);
}

public sealed class OtpThrottleException : Exception
{
    public OtpThrottleException(string message) : base(message) { }
}

public sealed class OtpService : IOtpService
{
    private readonly IDistributedCache _cache;
    private readonly OtpOptions        _opts;
    private readonly byte[]            _hmacKey;

    public OtpService(IDistributedCache cache, IConfiguration cfg)
    {
        _cache = cache;
        _opts  = new OtpOptions(cfg);
        _hmacKey = Convert.FromBase64String(_opts.HmacKey);
    }

    public async Task<string> IssueAsync(string destination, CancellationToken ct = default)
    {
        var key      = NormalizeKey(destination);
        var sentKey  = $"otp:sent:{key}";
        var dataKey  = $"otp:data:{key}";
        var lockKey  = $"otp:lock:{key}";

        // Lockout проверка
        if (await _cache.GetStringAsync(lockKey, ct) is not null)
            throw new OtpThrottleException(
                $"Слишком много неуспешных попыток. Попробуйте через {_opts.LockoutDuration.TotalMinutes:0} мин.");

        // Cooldown между отправками
        if (await _cache.GetStringAsync(sentKey, ct) is not null)
            throw new OtpThrottleException(
                $"Код уже отправлен. Запросите новый через {_opts.SendCooldown.TotalSeconds:0} с.");

        // Генерация кода 6 цифр
        var codeNumber = RandomNumberGenerator.GetInt32(0, 1_000_000);
        var code = codeNumber.ToString("D6");

        var entry = new OtpEntry(ComputeHmac(code), 0);
        await _cache.SetStringAsync(dataKey, entry.Serialize(), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = _opts.CodeLifetime,
        }, ct);

        await _cache.SetStringAsync(sentKey, "1", new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = _opts.SendCooldown,
        }, ct);

        return code;
    }

    public async Task<bool> VerifyAsync(string destination, string code, CancellationToken ct = default)
    {
        if (code is null || code.Length != 6 || !code.All(char.IsDigit)) return false;

        var key     = NormalizeKey(destination);
        var dataKey = $"otp:data:{key}";
        var lockKey = $"otp:lock:{key}";

        if (await _cache.GetStringAsync(lockKey, ct) is not null) return false;

        var raw = await _cache.GetStringAsync(dataKey, ct);
        if (raw is null) return false;

        var entry = OtpEntry.Deserialize(raw);

        var actualHmac   = ComputeHmac(code);
        var expectedHmac = entry.CodeHmac;

        // Constant-time сравнение
        var ok = CryptographicOperations.FixedTimeEquals(
            Convert.FromHexString(actualHmac),
            Convert.FromHexString(expectedHmac));

        if (ok)
        {
            await _cache.RemoveAsync(dataKey, ct);
            return true;
        }

        // Инкремент счётчика
        var newAttempts = entry.Attempts + 1;
        if (newAttempts >= _opts.MaxAttempts)
        {
            await _cache.RemoveAsync(dataKey, ct);
            await _cache.SetStringAsync(lockKey, "1", new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = _opts.LockoutDuration,
            }, ct);
        }
        else
        {
            // Перезаписываем с увеличенным счётчиком, не продлевая TTL — берём текущий остаток.
            // IDistributedCache не возвращает TTL → перезаписываем с прежним AbsoluteExpiration.
            await _cache.SetStringAsync(dataKey,
                new OtpEntry(expectedHmac, newAttempts).Serialize(),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = _opts.CodeLifetime,
                }, ct);
        }

        return false;
    }

    private string ComputeHmac(string code)
    {
        using var h = new HMACSHA256(_hmacKey);
        return Convert.ToHexString(h.ComputeHash(Encoding.UTF8.GetBytes(code))).ToLowerInvariant();
    }

    private static string NormalizeKey(string destination) =>
        destination.Trim().ToLowerInvariant();

    private readonly record struct OtpEntry(string CodeHmac, int Attempts)
    {
        public string Serialize() => $"{CodeHmac}:{Attempts}";
        public static OtpEntry Deserialize(string raw)
        {
            var parts = raw.Split(':', 2);
            return new OtpEntry(parts[0], int.Parse(parts[1]));
        }
    }

    private sealed class OtpOptions
    {
        public string  HmacKey         { get; }
        public TimeSpan CodeLifetime    { get; }
        public TimeSpan SendCooldown    { get; }
        public TimeSpan LockoutDuration { get; }
        public int      MaxAttempts     { get; }

        public OtpOptions(IConfiguration cfg)
        {
            var s = cfg.GetSection("Kyc:Otp");
            HmacKey         = s["HmacKey"]
                ?? throw new InvalidOperationException("Kyc:Otp:HmacKey not configured.");
            CodeLifetime    = TimeSpan.FromSeconds(s.GetValue("CodeLifetimeSec", 300));
            SendCooldown    = TimeSpan.FromSeconds(s.GetValue("SendCooldownSec", 60));
            LockoutDuration = TimeSpan.FromMinutes(s.GetValue("LockoutMinutes", 15));
            MaxAttempts     = s.GetValue("MaxAttempts", 5);
        }
    }
}
