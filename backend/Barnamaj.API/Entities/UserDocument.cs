namespace Barnamaj.API.Entities;

/// <summary>Тип удостоверяющего документа (рынок РК).</summary>
public enum DocumentType : byte
{
    // ── Документы физического лица (Individual KYC) ─────────
    /// <summary>Удостоверение личности гражданина РК (требует обе стороны)</summary>
    NationalId = 1,

    /// <summary>Паспорт РК (главная страница + страница с пропиской при необходимости)</summary>
    Passport = 2,

    /// <summary>Вид на жительство / удостоверение лица без гражданства</summary>
    ResidencePermit = 3,

    // ── Документы юридического лица (Legal KYC) ─────────────
    /// <summary>Удостоверение личности ответственного лица (representative) + селфи.
    /// Используется в Legal-заявке для подтверждения личности подающего.</summary>
    ResponsiblePersonId = 10,

    /// <summary>Документ-основание полномочий ответственного лица.
    /// Универсальный слот: приказ о назначении / нотариальная доверенность /
    /// решение учредителей / выписка из устава.
    /// Для ИП с representative=Owner НЕ требуется.</summary>
    AuthorityDocument = 11,

    /// <summary>Справка/выписка о государственной регистрации юр. лица или ИП.
    /// Опционально — может быть запрошен модератором, если данных из госреестра
    /// недостаточно (например, реестр недоступен или БИН свежей даты).</summary>
    CompanyRegistration = 12,
}

/// <summary>Статус проверки документа модератором или KYC-провайдером.</summary>
public enum DocumentStatus : byte
{
    /// <summary>Загружен, ожидает проверки</summary>
    Pending = 0,

    /// <summary>На проверке у модератора/провайдера</summary>
    InReview = 1,

    /// <summary>Одобрен — пользователь получает KYC Full</summary>
    Approved = 2,

    /// <summary>Отклонён — указана причина, нужна повторная загрузка</summary>
    Rejected = 3,
}

/// <summary>
/// Документ пользователя для KYC-верификации.
///
/// Файлы хранятся в private MinIO bucket (см. IDocumentStorage).
/// В БД лежит только object key (например, "kyc/{userId}/{guid}_front.jpg") —
/// прямой публичный доступ исключён, выдаётся presigned URL только модераторам.
/// </summary>
public class UserDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>FK на KycSubmission, в которую входит документ.
    /// Null — для legacy-документов, загруженных до введения submissions.</summary>
    public Guid? SubmissionId { get; set; }
    public KycSubmission? Submission { get; set; }

    public DocumentType   DocumentType { get; set; }
    public DocumentStatus Status       { get; set; } = DocumentStatus.Pending;

    /// <summary>S3/MinIO object key передней стороны / главной страницы.</summary>
    public string FrontObjectKey { get; set; } = string.Empty;

    /// <summary>S3/MinIO object key задней стороны (обязателен для NationalId).</summary>
    public string? BackObjectKey { get; set; }

    /// <summary>S3/MinIO object key селфи с документом (liveness-stub).</summary>
    public string SelfieObjectKey { get; set; } = string.Empty;

    /// <summary>SHA-256 hash содержимого front-файла (детект дубликатов и подмены).</summary>
    public string FrontSha256 { get; set; } = string.Empty;

    /// <summary>Кто принял решение (модератор UserId) или null для провайдера.</summary>
    public Guid? ReviewedByUserId { get; set; }

    /// <summary>Комментарий модератора при Rejected.</summary>
    public string? RejectionReason { get; set; }

    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt  { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}
