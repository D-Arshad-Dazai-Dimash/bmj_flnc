namespace Barnamaj.API.DTOs.Projects;

/// <summary>
/// Заявка (отклик) в списке для заказчика.
/// </summary>
public sealed record ApplicationListItemDto(
    Guid     Id,
    Guid     ProjectId,
    Guid     ApplicantProfileId,
    string   ApplicantProfileName,
    string?  ApplicantProfileLogoUrl,
    string?  CoverLetter,
    decimal? ProposedBudget,
    string   Status,
    DateTime CreatedAt,
    Guid?    ChatThreadId
);
