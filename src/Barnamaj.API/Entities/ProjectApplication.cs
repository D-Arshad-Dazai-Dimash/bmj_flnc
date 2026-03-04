namespace Barnamaj.API.Entities;

/// <summary>
/// Заявка от профиля (фрилансер / клан) на выполнение проекта.
///
/// Статусы:
///   Pending  — заявка подана, ожидает решения заказчика
///   Accepted — принята (ExecutorProfileId обновляется в Project)
///   Rejected — отклонена заказчиком
///   Withdrawn — отозвана самим заявителем
/// </summary>
public enum ApplicationStatus : byte
{
    Pending   = 0,
    Accepted  = 1,
    Rejected  = 2,
    Withdrawn = 3,
}

/// <summary>
/// Заявка на выполнение проекта.
///</summary>
public class ProjectApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── FK: Проект ───────────────────────────────────────────
    public Guid    ProjectId { get; set; }
    public Project Project   { get; set; } = null!;

    // ── FK: Претендент (Profile фрилансера / клана) ──────────
    public Guid    ApplicantProfileId { get; set; }
    public Profile ApplicantProfile   { get; set; } = null!;

    // ── Сопроводительное письмо ──────────────────────────────
    public string? CoverLetter { get; set; }

    // ── Предлагаемая цена (может отличаться от бюджета) ──────
    public decimal? ProposedBudget { get; set; }

    // ── Статус заявки ────────────────────────────────────────
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;

    // ── Временные метки ──────────────────────────────────────
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
