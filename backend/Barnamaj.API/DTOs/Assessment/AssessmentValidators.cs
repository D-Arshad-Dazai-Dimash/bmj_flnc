using Barnamaj.API.DTOs.Assessment;
using FluentValidation;

namespace Barnamaj.API.DTOs.Assessment;

public class SubmitAssessmentDtoValidator : AbstractValidator<SubmitAssessmentDto>
{
    public SubmitAssessmentDtoValidator()
    {
        RuleFor(x => x.ProfileId)
            .NotEmpty().WithMessage("ProfileId обязателен.");

        RuleFor(x => x.SkillId)
            .NotEmpty().WithMessage("SkillId обязателен.");

        RuleFor(x => x.Answers)
            .NotNull().WithMessage("Список ответов не может быть пустым.")
            .Must(a => a.Count > 0).WithMessage("Нужно ответить хотя бы на один вопрос.")
            .Must(a => a.Count <= 50).WithMessage("Тест не может содержать более 50 вопросов.");

        RuleForEach(x => x.Answers).ChildRules(answer =>
        {
            answer.RuleFor(a => a.QuestionId)
                .NotEmpty().WithMessage("QuestionId обязателен.");
            answer.RuleFor(a => a.SelectedIndex)
                .LessThan((byte)10).WithMessage("Индекс ответа не может быть ≥ 10.");
        });
    }
}
