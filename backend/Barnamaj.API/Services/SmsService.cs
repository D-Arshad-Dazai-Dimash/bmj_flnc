namespace Barnamaj.API.Services;

/// <summary>
/// Провайдер отправки SMS. Реализации:
///   • ConsoleSmsProvider — dev: пишет код в логи.
///   • MobizonSmsProvider — prod: реальная отправка через Mobizon API.
/// </summary>
public interface ISmsProvider
{
    Task SendAsync(string phone, string message, CancellationToken ct = default);
}

/// <summary>
/// Dev-провайдер: пишет SMS-код в Serilog.
/// Используется, если в appsettings нет секции "Sms:Mobizon:ApiKey".
/// </summary>
public sealed class ConsoleSmsProvider : ISmsProvider
{
    private readonly ILogger<ConsoleSmsProvider> _logger;
    public ConsoleSmsProvider(ILogger<ConsoleSmsProvider> logger) => _logger = logger;

    public Task SendAsync(string phone, string message, CancellationToken ct = default)
    {
        _logger.LogInformation("[ConsoleSms] To {Phone}: {Message}", phone, message);
        return Task.CompletedTask;
    }
}

/// <summary>
/// Заглушка под Mobizon. Реальная HTTP-отправка подключается на Неделе 4
/// (требует boot-up аккаунта и баланса). Сейчас логирует факт обращения.
/// </summary>
public sealed class MobizonSmsProvider : ISmsProvider
{
    private readonly ILogger<MobizonSmsProvider> _logger;
    private readonly string _apiKey;

    public MobizonSmsProvider(IConfiguration config, ILogger<MobizonSmsProvider> logger)
    {
        _logger = logger;
        _apiKey = config["Sms:Mobizon:ApiKey"] ?? string.Empty;
    }

    public Task SendAsync(string phone, string message, CancellationToken ct = default)
    {
        // TODO (Неделя 4): https://mobizon.kz/api — POST /service/message/sendsmsmessage
        _logger.LogWarning("[MobizonSms] STUB — would send to {Phone}: {Message}", phone, message);
        return Task.CompletedTask;
    }
}
