namespace Barnamaj.API.Entities;

/// <summary>
/// Аудит-журнал событий KYC. Хранится 5 лет (требование закона РК
/// «О ПОД/ФТ» №191-IV, ст. 12 — срок хранения данных идентификации).
///
/// ВАЖНО: PayloadJson НЕ должен содержать персональных данных
/// (телефон, ИИН, email, номера документов). Только техническую информацию:
/// результат проверки, идентификатор провайдера, тайминги.
/// </summary>
public class KycEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>
    /// Тип события: phone_code_sent | phone_verified | iin_set | doc_uploaded |
    /// doc_approved | doc_rejected | provider_check | kyc_full | kyc_reset.
    /// </summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>Источник события (system | moderator | sumsub | veriff | egov).</summary>
    public string? Provider { get; set; }

    /// <summary>Внешний идентификатор операции у провайдера (для расследования).</summary>
    public string? ProviderRef { get; set; }

    /// <summary>JSON без PII. См. предупреждение в XML-комментарии класса.</summary>
    public string? PayloadJson { get; set; }

    /// <summary>IP-адрес инициатора (для антифрод-расследования).</summary>
    public string? IpAddress { get; set; }

    /// <summary>User-Agent инициатора.</summary>
    public string? UserAgent { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
