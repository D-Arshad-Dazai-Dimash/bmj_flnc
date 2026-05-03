namespace Barnamaj.API.Services;

/// <summary>SMS-провайдер. Dev-реализация: сообщение пишется в лог.
/// Prod: подключается казахстанский шлюз (Mobizon, SMSC.kz, Beeline KZ Business API).</summary>
public interface ISmsProvider
{
    Task SendAsync(string phone, string message, CancellationToken ct = default);
}

public sealed class ConsoleSmsProvider : ISmsProvider
{
    private readonly ILogger<ConsoleSmsProvider> _logger;
    public ConsoleSmsProvider(ILogger<ConsoleSmsProvider> logger) => _logger = logger;

    public Task SendAsync(string phone, string message, CancellationToken ct = default)
    {
        // Маскируем номер в логах: +7XXXX***XX
        var masked = MaskPhone(phone);
        _logger.LogInformation("[DEV-SMS] to {Phone}: {Message}", masked, message);
        return Task.CompletedTask;
    }

    private static string MaskPhone(string phone)
    {
        if (string.IsNullOrEmpty(phone) || phone.Length < 6) return "***";
        return $"{phone[..5]}***{phone[^2..]}";
    }
}
