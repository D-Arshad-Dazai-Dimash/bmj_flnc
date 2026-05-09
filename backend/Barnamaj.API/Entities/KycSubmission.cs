namespace Barnamaj.API.Entities;

/// <summary>
/// Тип KYC-заявки.
///
/// Individual — физическое лицо (фрилансер, частный заказчик).
/// Legal      — юридическое лицо (ТОО / АО / ИП), подаёт «ответственное лицо»
///              (representative), Stripe-style: владелец, директор, бухгалтер
///              или доверенное лицо с подтверждённой связью с компанией.
/// </summary>
public enum KycSubmissionKind : byte
{
    Individual = 1,
    Legal      = 2,
}

/// <summary>
/// Статус KYC-заявки.
///
/// Pending      — создана, ждёт автоматического анализа.
/// AiApproved   — AI рекомендовал одобрение (но финальное решение всё равно
///                за модератором в v1; авто-апрув не делаем до подключения OCR/liveness).
/// AiRejected   — AI отклонил по жёстким правилам (например, БИН не валиден
///                или отсутствуют обязательные документы); пользователь видит
///                причину и может пересдать.
/// ManualReview — заявка попала в очередь модератору.
/// Approved     — финально одобрено модератором → User.KycStatus=Full.
/// Rejected     — финально отклонено модератором → User.KycStatus=Rejected.
/// </summary>
public enum KycSubmissionStatus : byte
{
    Pending      = 0,
    AiApproved   = 1,
    AiRejected   = 2,
    ManualReview = 3,
    Approved     = 4,
    Rejected     = 5,
}

/// <summary>
/// Роль ответственного лица (representative) в юр. KYC-заявке.
///
/// Owner    — собственник / учредитель ИП.
/// Director — первый руководитель ТОО/АО (приказ о назначении / устав).
/// Proxy    — доверенное лицо (нотариальная доверенность).
/// Accountant — главный бухгалтер с правом подписи.
/// </summary>
public enum ResponsibleRole : byte
{
    Owner      = 1,
    Director   = 2,
    Proxy      = 3,
    Accountant = 4,
}

/// <summary>
/// KYC-заявка: атомарная группа связанных документов и снапшот введённых данных
/// на момент подачи.
///
/// Зачем сущность, а не плоский набор документов:
///   • атомарное Approve/Reject всей пачки за одну транзакцию;
///   • аудит — модератор видит ровно то, что пользователь заявлял, даже если
///     юзер позже изменил данные профиля;
///   • AI-вердикт хранится здесь, а не на каждом документе;
///   • один pending-submission на пользователя (уникальный частичный индекс).
/// </summary>
public class KycSubmission
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User User   { get; set; } = null!;

    public KycSubmissionKind   Kind   { get; set; }
    public KycSubmissionStatus Status { get; set; } = KycSubmissionStatus.Pending;

    // ── Snapshot legal-полей (только для Kind=Legal) ────────
    /// <summary>Организационно-правовая форма: ТОО | АО | ИП.</summary>
    public string? LegalForm    { get; set; }
    /// <summary>БИН (12 цифр) для ТОО/АО; ИИН для ИП.</summary>
    public string? Bin          { get; set; }
    public string? LegalName    { get; set; }
    public string? LegalAddress { get; set; }
    /// <summary>Контактный телефон организации (опционально, обычно = телефон представителя).</summary>
    public string? ContactPhone { get; set; }

    // ── Representative (ответственное лицо) ─────────────────
    public ResponsibleRole? ResponsibleRole { get; set; }
    /// <summary>ФИО ответственного лица (для отображения модератору).</summary>
    public string? ResponsibleName { get; set; }

    // ── Внешний реестр (statgov.kz lookup) ──────────────────
    /// <summary>JSON-снимок ответа из реестра по БИН на момент подачи.
    /// Хранится для аудита: модератор может сверить введённое с тем, что вернуло государство.</summary>
    public string? RegistrySnapshotJson { get; set; }

    // ── AI-вердикт ───────────────────────────────────────────
    /// <summary>"approve" | "reject" | "manual"</summary>
    public string? AiDecision   { get; set; }
    /// <summary>0..1, для UI и логирования.</summary>
    public double? AiConfidence { get; set; }
    /// <summary>Объяснение для модератора. Без PII.</summary>
    public string? AiReasoning  { get; set; }

    // ── Финальное решение ────────────────────────────────────
    public Guid?     ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt       { get; set; }
    public string?   RejectionReason  { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── Связи ───────────────────────────────────────────────
    public ICollection<UserDocument> Documents { get; set; } = new List<UserDocument>();
}
