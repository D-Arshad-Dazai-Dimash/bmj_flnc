using Barnamaj.API.Entities;
using FluentValidation;

namespace Barnamaj.API.DTOs.Profiles;

/// <summary>
/// Валидатор для создания нового профиля клана или компании.
/// </summary>
public sealed class CreateProfileDtoValidator : AbstractValidator<CreateProfileDto>
{
    public CreateProfileDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Название не может быть пустым.")
            .MinimumLength(2).WithMessage("Название должно содержать минимум 2 символа.")
            .MaximumLength(100).WithMessage("Название не может быть длиннее 100 символов.");

        RuleFor(x => x.Bio)
            .MaximumLength(2000).WithMessage("Описание не может быть длиннее 2000 символов.")
            .When(x => x.Bio is not null);

        RuleFor(x => x.LogoUrl)
            .MaximumLength(512).WithMessage("URL логотипа слишком длинный.")
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _))
            .WithMessage("LogoUrl должен быть корректным URL.")
            .When(x => !string.IsNullOrEmpty(x.LogoUrl));

        RuleFor(x => x.AccountType)
            .Must(t => t == AccountType.Clan || t == AccountType.Company)
            .WithMessage("accountType должен быть 2 (Company) или 3 (Clan). " +
                         "Individual-профиль создаётся автоматически при регистрации.");
    }
}

/// <summary>
/// Валидатор для приглашения пользователя по email.
/// </summary>
public sealed class InviteUserDtoValidator : AbstractValidator<InviteUserDto>
{
    public InviteUserDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email не может быть пустым.")
            .EmailAddress().WithMessage("Введите корректный email адрес.")
            .MaximumLength(320).WithMessage("Email слишком длинный.");
    }
}
