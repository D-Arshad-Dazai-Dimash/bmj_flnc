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

        // NIST SP 800-63B (2024+) — длина важнее искусственной "сложности".
        // Не принуждаем к спецсимволам/цифрам; рекомендуем длинные парольные фразы.
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Пароль обязателен.")
            .MinimumLength(8).WithMessage("Минимум 8 символов. Рекомендуем 12+ для лучшей защиты.")
            .MaximumLength(128).WithMessage("Пароль не может быть длиннее 128 символов.");

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
