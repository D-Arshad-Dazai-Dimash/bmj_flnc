using FluentValidation;

namespace Barnamaj.API.DTOs.Auth;

/// <summary>Запрос на отправку SMS-кода. Phone в международном формате (+77...).</summary>
public sealed record SendPhoneCodeDto(string Phone);

/// <summary>Подтверждение телефона по коду из SMS.</summary>
public sealed record VerifyPhoneDto(string Phone, string Code);

/// <summary>Установка/обновление ИИН в профиле.</summary>
public sealed record SetIinDto(string Iin, bool ConsentGiven);

public sealed class SendPhoneCodeDtoValidator : AbstractValidator<SendPhoneCodeDto>
{
    public SendPhoneCodeDtoValidator()
    {
        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Телефон обязателен.")
            .Matches(@"^\+\d{10,15}$")
            .WithMessage("Формат: +<код страны><номер>, например +77011234567.");
    }
}

public sealed class VerifyPhoneDtoValidator : AbstractValidator<VerifyPhoneDto>
{
    public VerifyPhoneDtoValidator()
    {
        RuleFor(x => x.Phone).NotEmpty().Matches(@"^\+\d{10,15}$");
        RuleFor(x => x.Code).NotEmpty().Length(6).Matches(@"^\d{6}$")
            .WithMessage("Код — 6 цифр.");
    }
}

public sealed class SetIinDtoValidator : AbstractValidator<SetIinDto>
{
    public SetIinDtoValidator()
    {
        RuleFor(x => x.Iin)
            .NotEmpty().WithMessage("ИИН обязателен.")
            .Matches(@"^\d{12}$").WithMessage("ИИН — 12 цифр.");

        RuleFor(x => x.ConsentGiven)
            .Equal(true).WithMessage("Требуется согласие на обработку персональных данных.");
    }
}
