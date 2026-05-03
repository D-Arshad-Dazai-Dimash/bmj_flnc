namespace Barnamaj.API.DTOs.Kyc;

// ── Входящие DTO ─────────────────────────────────────────

public sealed record SendPhoneCodeDto(string Phone);
public sealed record VerifyPhoneDto(string Phone, string Code);
public sealed record SetIinDto(string Iin);

/// <summary>Решение модератора по документу.</summary>
public sealed record RejectDocumentDto(string Reason);

// ── Исходящие DTO ────────────────────────────────────────

public sealed record KycStatusDto(
    string  Status,             // None | Lite | DocPending | Full | Rejected
    bool    IsPhoneVerified,
    string? Phone,              // маскированный: +7XXXX***XX
    bool    HasIin,
    string? IinMasked,          // XXX***XXXXX
    DateTime? KycVerifiedAt,
    DocumentSummaryDto? LatestDocument
);

public sealed record DocumentSummaryDto(
    Guid     Id,
    string   DocumentType,
    string   Status,
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
