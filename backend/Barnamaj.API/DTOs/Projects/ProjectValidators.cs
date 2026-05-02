using FluentValidation;

namespace Barnamaj.API.DTOs.Projects;

/// <summary>
/// Валидатор для создания нового проекта.
/// </summary>
public sealed class CreateProjectDtoValidator : AbstractValidator<CreateProjectDto>
{
    public CreateProjectDtoValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Название проекта не может быть пустым.")
            .MinimumLength(5).WithMessage("Название должно содержать минимум 5 символов.")
            .MaximumLength(256).WithMessage("Название не может быть длиннее 256 символов.");

        RuleFor(x => x.Description)
            .MaximumLength(10_000).WithMessage("Описание не может превышать 10 000 символов.")
            .When(x => x.Description is not null);

        RuleFor(x => x.ClientProfileId)
            .NotEmpty().WithMessage("ClientProfileId обязателен.");

        RuleFor(x => x.Budget)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Бюджет не может быть отрицательным.")
            .LessThanOrEqualTo(1_000_000_000)
            .WithMessage("Бюджет не может превышать 1 000 000 000.")
            .When(x => x.Budget.HasValue);

        RuleFor(x => x.Deadline)
            .GreaterThan(DateTime.UtcNow)
            .WithMessage("Дедлайн должен быть в будущем.")
            .When(x => x.Deadline.HasValue);
    }
}

/// <summary>
/// Валидатор для подачи заявки на выполнение проекта.
/// </summary>
public sealed class ApplyToProjectDtoValidator : AbstractValidator<ApplyToProjectDto>
{
    public ApplyToProjectDtoValidator()
    {
        RuleFor(x => x.ApplicantProfileId)
            .NotEmpty().WithMessage("ApplicantProfileId обязателен.");

        RuleFor(x => x.CoverLetter)
            .MaximumLength(5000).WithMessage("Сопроводительное письмо не может превышать 5 000 символов.")
            .When(x => x.CoverLetter is not null);

        RuleFor(x => x.ProposedBudget)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Предложенный бюджет не может быть отрицательным.")
            .When(x => x.ProposedBudget.HasValue);
    }
}
