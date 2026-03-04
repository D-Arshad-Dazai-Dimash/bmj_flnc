using System.Text.Json.Serialization;

namespace Barnamaj.API.DTOs.Assessment;

// ═══════════════════════════════════════════════════════════════════════════
// ВХОДЯЩИЕ (Request)
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Тело запроса на сдачу теста.
/// Содержит profileId (от чьего имени сдаётся) и список ответов.
/// </summary>
public record SubmitAssessmentDto(
    Guid ProfileId,
    Guid SkillId,
    IReadOnlyList<AnswerItemDto> Answers
);

/// <summary>Ответ на один вопрос теста.</summary>
public record AnswerItemDto(
    Guid QuestionId,
    /// <summary>0-based индекс выбранного варианта</summary>
    byte SelectedIndex
);

// ═══════════════════════════════════════════════════════════════════════════
// ИСХОДЯЩИЕ (Response)
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>Краткая информация о навыке для листинга.</summary>
public record SkillDto(
    Guid    Id,
    string  Name,
    string? Description,
    string? Category,
    /// <summary>Количество активных вопросов в базе</summary>
    int     QuestionCount
);

/// <summary>
/// Один вопрос теста с вариантами ответов.
/// ⛔ НЕ содержит CorrectAnswerIndex.
/// </summary>
public record QuestionDto(
    Guid                   Id,
    string                 Text,
    IReadOnlyList<string>  Options,
    string                 Difficulty
);

/// <summary>Результат отправки теста.</summary>
public record AssessmentResultDto(
    Guid         AttemptId,
    Guid         ProfileId,
    Guid         SkillId,
    string       SkillName,
    int          CorrectCount,
    int          TotalCount,
    decimal      ScorePercent,
    string       Status,           // "Passed" | "Failed"
    bool         BadgeAwarded,
    /// <summary>Детальный разбор каждого вопроса (показывается ПОСЛЕ сдачи)</summary>
    IReadOnlyList<AnswerReviewDto> Review
);

/// <summary>Разбор одного вопроса после завершения теста.</summary>
public record AnswerReviewDto(
    Guid   QuestionId,
    string QuestionText,
    byte   CorrectIndex,   // раскрывается только в ответе после сдачи
    byte   YourIndex,
    bool   IsCorrect
);

/// <summary>Краткая информация о бейдже навыка на профиле.</summary>
public record ProfileBadgeDto(
    Guid    SkillId,
    string  SkillName,
    string? Category,
    decimal BestScore,
    DateTime AchievedAt
);
