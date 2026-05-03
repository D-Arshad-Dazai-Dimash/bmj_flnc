namespace Barnamaj.API.Entities;

/// <summary>
/// Запись в журнале KYC-событий пользователя.
///
/// Хранится для аудита (закон РК «О ПОД/ФТ» — срок ≥ 5 лет).
/// Сами документы не храним; только результат и ссылка на провайдера.
/// </summary>
public class KycEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK на пользователя</summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Тип события: phone_send, phone_verified, iin_set, iin_invalid,
    /// consent_given, sumsub_init, sumsub_approved, sumsub_rejected.
    /// </summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>local | mobizon | sumsub | egov</summary>
    public string? Provider { get; set; }

    /// <summary>Идентификатор операции у провайдера (например, applicantId Sumsub).</summary>
    public string? ProviderRef { get; set; }

    /// <summary>Произвольные детали события (хэш телефона, причина отказа и т.д.). JSON.</summary>
    public string? PayloadJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
