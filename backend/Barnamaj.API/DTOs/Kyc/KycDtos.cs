namespace Barnamaj.API.DTOs.Kyc;

// ── Входящие DTO ─────────────────────────────────────────

public sealed record SendPhoneCodeDto(string Phone);
public sealed record VerifyPhoneDto(string Phone, string Code);
public sealed record SetIinDto(string Iin);

/// <summary>Решение модератора по документу.</summary>
public sealed record RejectDocumentDto(string Reason);

/// <summary>Решение модератора по KYC-заявке (submission).</summary>
public sealed record RejectSubmissionDto(string Reason);

// ── Исходящие DTO ────────────────────────────────────────

public sealed record KycStatusDto(
    string  Status,             // None | Lite | DocPending | Full | Rejected
    bool    IsPhoneVerified,
    string? Phone,              // маскированный: +7XXXX***XX
    bool    HasIin,
    string? IinMasked,          // XXX***XXXXX
    DateTime? KycVerifiedAt,
    DocumentSummaryDto? LatestDocument,
    SubmissionSummaryDto? LatestSubmission,
    string  AccountType        // Individual | Company | Clan
);

public sealed record DocumentSummaryDto(
    Guid     Id,
    string   DocumentType,
    string   Status,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    string?  RejectionReason
);

/// <summary>Краткая информация о KYC-заявке для статуса пользователя.</summary>
public sealed record SubmissionSummaryDto(
    Guid     Id,
    string   Kind,              // Individual | Legal
    string   Status,             // Pending | AiApproved | AiRejected | ManualReview | Approved | Rejected
    string?  AiDecision,         // approve | reject | manual
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    string?  RejectionReason
);

public sealed record PendingDocumentDto(
    Guid     Id,
    Guid     UserId,
    string   UserEmail,
    string   DocumentType,
    string   Status,
    string   FrontUrl,
    string?  BackUrl,
    string   SelfieUrl,
    DateTime CreatedAt
);

// ── Legal KYC ────────────────────────────────────────────

/// <summary>Поля legal-заявки (без файлов; файлы передаются [FromForm]).</summary>
public sealed record LegalKycFieldsDto(
    string LegalForm,        // ТОО | АО | ИП
    string Bin,              // 12 цифр
    string LegalName,        // юр. наименование
    string? LegalAddress,    // юр. адрес (может прийти из реестра)
    string? ContactPhone,    // контактный телефон организации (опц.)
    string ResponsibleRole,  // Owner | Director | Proxy | Accountant
    string ResponsibleName   // ФИО ответственного лица
);

/// <summary>Результат lookup'а БИН в реестре (statgov stub в v1).</summary>
public sealed record LegalEntityLookupDto(
    string  Bin,
    string  LegalForm,
    string  Name,
    string? Address,
    string? Director,
    bool    IsActive,
    string  Source
);

/// <summary>Документ внутри pending-заявки (для админ-UI).</summary>
public sealed record SubmissionDocumentDto(
    Guid    Id,
    string  DocumentType,
    string  FrontUrl,
    string? BackUrl,
    string  SelfieUrl
);

/// <summary>Pending-заявка для очереди модератора.</summary>
public sealed record PendingSubmissionDto(
    Guid     Id,
    Guid     UserId,
    string   UserEmail,
    string   Kind,                // Individual | Legal
    string   Status,
    // legal-snapshot (null для individual):
    string?  LegalForm,
    string?  Bin,
    string?  LegalName,
    string?  LegalAddress,
    string?  ContactPhone,
    string?  ResponsibleRole,
    string?  ResponsibleName,
    // AI-вердикт:
    string?  AiDecision,
    double?  AiConfidence,
    string?  AiReasoning,
    DateTime CreatedAt,
    IReadOnlyList<SubmissionDocumentDto> Documents
);

