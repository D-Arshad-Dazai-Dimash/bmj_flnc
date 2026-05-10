namespace Barnamaj.API.DTOs.Chat;

// ═══════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Открыть существующий диалог с указанным профилем или создать новый.
/// </summary>
public sealed record StartThreadDto(
    Guid  OtherProfileId,
    Guid? ProjectId
);

/// <summary>
/// Отправить сообщение в тред.
/// </summary>
public sealed record SendMessageDto(
    string Body,
    Guid?  ProjectId
);

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Краткая мета-информация о диалоге (для списка чатов).
/// </summary>
public sealed record ChatThreadDto(
    Guid     Id,
    Guid     OtherProfileId,
    string   OtherProfileName,
    string?  OtherProfileLogoUrl,
    Guid?    ProjectId,
    string?  ProjectTitle,
    string?  LastMessageBody,
    DateTime UpdatedAt,
    bool     HasUnread
);

/// <summary>
/// Одно сообщение.
/// </summary>
public sealed record ChatMessageDto(
    Guid     Id,
    Guid     ThreadId,
    Guid     SenderProfileId,
    string   SenderProfileName,
    string   Body,
    bool     IsSystem,
    Guid?    ProjectId,
    DateTime CreatedAt
);
