using Barnamaj.API.Entities;

namespace Barnamaj.API.DTOs.Projects;

// ═══════════════════════════════════════════════════════════════════════════
// INPUT DTOs
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Запрос на создание нового проекта (ТЗ).
/// </summary>
/// <param name="ClientProfileId">
///   Id профиля, от лица которого размещается заказ.
///   Текущий пользователь должен быть Owner этого профиля.
/// </param>
public sealed record CreateProjectDto(
    string    Title,
    string?   Description,
    Guid      ClientProfileId,
    decimal?  Budget,
    DateTime? Deadline
);

/// <summary>
/// Запрос на подачу заявки на выполнение проекта.
/// </summary>
/// <param name="ApplicantProfileId">
///   Id профиля-исполнителя (фрилансер / клан).
///   Текущий пользователь должен быть Owner или Member (Active) этого профиля.
/// </param>
public sealed record ApplyToProjectDto(
    Guid     ApplicantProfileId,
    string?  CoverLetter,
    decimal? ProposedBudget
);

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT DTOs
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Краткая информация о проекте (используется в ленте и списках).
/// </summary>
public sealed record ProjectSummaryDto(
    Guid      Id,
    string    Title,
    string?   Description,
    decimal?  Budget,
    DateTime? Deadline,
    string    Status,
    string    ClientProfileName,
    Guid      ClientProfileId,
    string    ClientProfileType,
    int       ApplicationCount,
    DateTime  CreatedAt
);

/// <summary>
/// Полная информация о проекте (детальная страница).
/// </summary>
public sealed record ProjectDetailDto(
    Guid      Id,
    string    Title,
    string?   Description,
    decimal?  Budget,
    DateTime? Deadline,
    string    Status,
    // Заказчик
    Guid      ClientProfileId,
    string    ClientProfileName,
    string    ClientProfileType,
    // Исполнитель (null если не назначен)
    Guid?     ExecutorProfileId,
    string?   ExecutorProfileName,
    // Счётчики
    int       ApplicationCount,
    DateTime  CreatedAt,
    DateTime  UpdatedAt
);

/// <summary>
/// Ответ при подаче заявки на проект.
/// </summary>
public sealed record ApplicationResponseDto(
    Guid     ApplicationId,
    Guid     ProjectId,
    string   ProjectTitle,
    Guid     ApplicantProfileId,
    string   ApplicantProfileName,
    string   Status,         // "Pending"
    DateTime CreatedAt
);
