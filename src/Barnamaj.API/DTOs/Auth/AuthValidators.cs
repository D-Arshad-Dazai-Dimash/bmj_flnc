using Barnamaj.API.Entities;
using FluentValidation;

namespace Barnamaj.API.DTOs.Auth;

public sealed class RegisterDtoValidator : AbstractValidator<RegisterDto>
{
    public RegisterDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email обязателен.")
            .EmailAddress().WithMessage("Некорректный формат email.")
            .MaximumLength(256).WithMessage("Email не может быть длиннее 256 символов.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Пароль обязателен.")
            .MinimumLength(8).WithMessage("Пароль должен содержать минимум 8 символов.")
            .MaximumLength(128).WithMessage("Пароль не может быть длиннее 128 символов.")
            .Matches("[A-Z]").WithMessage("Пароль должен содержать хотя бы одну заглавную букву.")
            .Matches("[0-9]").WithMessage("Пароль должен содержать хотя бы одну цифру.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Имя / название обязательно.")
            .MinimumLength(2).WithMessage("Минимум 2 символа.")
            .MaximumLength(256).WithMessage("Имя не может быть длиннее 256 символов.");

        RuleFor(x => x.AccountType)
            .Must(t => t == AccountType.Individual || t == AccountType.Company)
            .WithMessage("При регистрации допустимы только Individual или Company. Clan создаётся отдельно.");

        RuleFor(x => x.Bio)
            .MaximumLength(2000).WithMessage("Bio не может быть длиннее 2000 символов.")
            .When(x => x.Bio is not null);
    }
}

public sealed class LoginDtoValidator : AbstractValidator<LoginDto>
{
    public LoginDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email обязателен.")
            .EmailAddress().WithMessage("Некорректный формат email.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Пароль обязателен.");
    }
}
