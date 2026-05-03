using Barnamaj.API.DTOs.Kyc;
using FluentValidation;

namespace Barnamaj.API.DTOs.Kyc;

public sealed class SendPhoneCodeValidator : AbstractValidator<SendPhoneCodeDto>
{
    public SendPhoneCodeValidator()
    {
        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Телефон обязателен.")
            .Matches(@"^\+7[0-9]{10}$").WithMessage("Формат: +7XXXXXXXXXX (Казахстан).");
    }
}

public sealed class VerifyPhoneValidator : AbstractValidator<VerifyPhoneDto>
{
    public VerifyPhoneValidator()
    {
        RuleFor(x => x.Phone)
            .Matches(@"^\+7[0-9]{10}$").WithMessage("Формат: +7XXXXXXXXXX.");
        RuleFor(x => x.Code)
            .NotEmpty()
            .Matches(@"^[0-9]{6}$").WithMessage("Код должен содержать 6 цифр.");
    }
}

public sealed class SetIinValidator : AbstractValidator<SetIinDto>
{
    public SetIinValidator()
    {
        RuleFor(x => x.Iin)
            .NotEmpty()
            .Matches(@"^[0-9]{12}$").WithMessage("ИИН должен содержать 12 цифр.");
    }
}

public sealed class RejectDocumentValidator : AbstractValidator<RejectDocumentDto>
{
    public RejectDocumentValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty()
            .MinimumLength(5).WithMessage("Причина минимум 5 символов.")
            .MaximumLength(500).WithMessage("Причина максимум 500 символов.");
    }
}
