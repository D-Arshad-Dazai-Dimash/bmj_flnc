using Barnamaj.API.Entities;

namespace Barnamaj.API.Services;

/// <summary>
/// Результат AI-анализа KYC-заявки.
///
/// Decision:
///   "approve" — все проверки пройдены, AI рекомендует одобрить
///               (в v1 это лишь подсказка модератору, авто-апрува нет).
///   "reject"  — заявка содержит непреодолимые ошибки (невалидный БИН,
///               отсутствующие обязательные документы) → пользователю
///               сразу видна причина и предложение пересдать.
///   "manual"  — нужна ручная проверка модератором (нейтральный кейс).
///
/// Confidence в диапазоне 0..1; используется для сортировки очереди.
/// </summary>
public sealed record AiReviewResult(string Decision, double Confidence, string Reasoning);

/// <summary>
/// Авто-проверка KYC-заявки. v1 — детерминированные правила (без OCR/LLM),
/// v3 — обёртка над Verigram/Sumsub. Контракт фиксирован.
///
/// Ключевая инвариант v1: <b>никогда не возвращает "approve" без модератора</b>.
/// "approve" зарезервировано на будущее (когда подключим OCR + face match);
/// сейчас успешные заявки получают "manual" с высокой confidence.
/// Это исключает ложные авто-одобрения.
/// </summary>
public interface IKycAiReviewer
{
    Task<AiReviewResult> ReviewAsync(KycSubmission submission, CancellationToken ct);
}

/// <summary>
/// Rules-based реализация: проверяет полноту полей и наличие обязательных
/// документов, не делает OCR/face-match.
/// </summary>
public sealed class RulesBasedKycAiReviewer : IKycAiReviewer
{
    private readonly ILegalEntityRegistry _registry;

    public RulesBasedKycAiReviewer(ILegalEntityRegistry registry)
    {
        _registry = registry;
    }

    public async Task<AiReviewResult> ReviewAsync(KycSubmission s, CancellationToken ct)
    {
        return s.Kind switch
        {
            KycSubmissionKind.Individual => ReviewIndividual(s),
            KycSubmissionKind.Legal      => await ReviewLegalAsync(s, ct),
            _                            => new("manual", 0.5, "Неизвестный тип заявки.")
        };
    }

    // ── Individual ────────────────────────────────────────────────────

    private static AiReviewResult ReviewIndividual(KycSubmission s)
    {
        // Для individual всё, что нужно проверить, уже в KycService:
        //   • phone verified, IIN HMAC set, документ загружен.
        // Submission создаётся только когда условия выполнены, поэтому AI
        // помечает заявку как готовую к ручной проверке.
        var hasIdDoc = s.Documents.Any(d =>
            d.DocumentType is DocumentType.NationalId
                            or DocumentType.Passport
                            or DocumentType.ResidencePermit);

        if (!hasIdDoc)
            return new("reject", 0.95, "Отсутствует удостоверяющий документ.");

        return new("manual", 0.7,
            "Все обязательные данные физического лица предоставлены. " +
            "Требуется визуальная сверка документа и селфи модератором.");
    }

    // ── Legal ─────────────────────────────────────────────────────────

    private async Task<AiReviewResult> ReviewLegalAsync(KycSubmission s, CancellationToken ct)
    {
        // 1. Базовая валидация полей
        if (string.IsNullOrWhiteSpace(s.LegalForm))
            return new("reject", 0.99, "Не указана организационно-правовая форма.");

        if (s.LegalForm is not ("ТОО" or "АО" or "ИП"))
            return new("reject", 0.99, $"Неподдерживаемая форма: {s.LegalForm}.");

        if (!IsValidBin(s.Bin))
            return new("reject", 0.99, "БИН должен быть из 12 цифр.");

        if (string.IsNullOrWhiteSpace(s.LegalName) || s.LegalName.Length < 3)
            return new("reject", 0.95, "Не указано или слишком короткое наименование.");

        if (s.ResponsibleRole is null || string.IsNullOrWhiteSpace(s.ResponsibleName))
            return new("reject", 0.95, "Не указано ответственное лицо.");

        // 2. Документы
        var hasResponsibleId = s.Documents.Any(d => d.DocumentType == DocumentType.ResponsiblePersonId);
        if (!hasResponsibleId)
            return new("reject", 0.95, "Отсутствует документ ответственного лица.");

        // ИП с representative=Owner: AuthorityDocument не требуется,
        // потому что ИП — единственный владелец и одновременно представитель.
        var needsAuthorityDoc =
            !(s.LegalForm == "ИП" && s.ResponsibleRole == ResponsibleRole.Owner);

        if (needsAuthorityDoc)
        {
            var hasAuthority = s.Documents.Any(d => d.DocumentType == DocumentType.AuthorityDocument);
            if (!hasAuthority)
                return new("reject", 0.95,
                    "Отсутствует документ-основание полномочий (приказ / доверенность / решение).");
        }

        // 3. Сверка с госреестром (если доступно)
        var registry = await _registry.LookupByBinAsync(s.Bin!, ct);
        if (registry is null)
        {
            // БИН не найден — это не reject, может быть свежий БИН или реестр
            // временно недоступен. Отправляем модератору для решения.
            return new("manual", 0.6,
                $"БИН {s.Bin} не найден в реестре. Рекомендуется запросить " +
                "справку о регистрации (CompanyRegistration) у заявителя.");
        }

        if (!registry.IsActive)
            return new("reject", 0.99,
                $"Юр. лицо в реестре отмечено как неактивное (ликвидировано/приостановлено).");

        if (!string.Equals(registry.LegalForm, s.LegalForm, StringComparison.OrdinalIgnoreCase))
            return new("reject", 0.95,
                $"Указанная форма ({s.LegalForm}) не совпадает с реестром ({registry.LegalForm}).");

        // 4. Высокая уверенность: всё совпадает
        var directorMatch = s.ResponsibleRole == ResponsibleRole.Director
            && registry.Director is not null
            && string.Equals(registry.Director.Trim(), s.ResponsibleName?.Trim(), StringComparison.OrdinalIgnoreCase);

        return new AiReviewResult(
            Decision: "manual",
            Confidence: directorMatch ? 0.9 : 0.7,
            Reasoning: directorMatch
                ? "Все данные совпадают с госреестром, ФИО директора подтверждено. " +
                  "Требуется визуальная сверка документов модератором."
                : "Базовая валидация пройдена. Сверьте документ-основание полномочий " +
                  "и удостоверение ответственного лица с данными реестра.");
    }

    private static bool IsValidBin(string? bin) =>
        !string.IsNullOrWhiteSpace(bin) && bin.Length == 12 && bin.All(char.IsDigit);
}
