namespace Barnamaj.API.Services;

/// <summary>Email-провайдер. Dev: пишет в лог. Prod: SMTP / SendGrid / Mailgun.</summary>
public interface IEmailProvider
{
    Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default);
}

public sealed class ConsoleEmailProvider : IEmailProvider
{
    private readonly ILogger<ConsoleEmailProvider> _logger;
    public ConsoleEmailProvider(ILogger<ConsoleEmailProvider> logger) => _logger = logger;

    public Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
    {
        var masked = MaskEmail(toEmail);
        _logger.LogInformation("[DEV-EMAIL] to {Email} subject={Subject}\n{Body}",
            masked, subject, htmlBody);
        return Task.CompletedTask;
    }

    private static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at < 2) return "***";
        return $"{email[..2]}***{email[at..]}";
    }
}
