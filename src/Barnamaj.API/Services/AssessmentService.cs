using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Assessment;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

public interface IAssessmentService
{
    /// <summary>Список доступных навыков для тестирования.</summary>
    Task<IReadOnlyList<SkillDto>> GetSkillsAsync(CancellationToken ct = default);

    /// <summary>
    /// Случайные вопросы по навыку для прохождения теста.
    /// ⛔ CorrectAnswerIndex не включается в ответ.
    /// </summary>
    Task<IReadOnlyList<QuestionDto>> GetQuestionsAsync(
        Guid skillId,
        int  count = 10,
        CancellationToken ct = default);

    /// <summary>
    /// Проверка ответов, подсчёт балла, обновление бейджа при Passed.
    /// Текущий пользователь должен быть активным участником / владельцем профиля.
    /// </summary>
    Task<AssessmentResultDto> SubmitAsync(
        SubmitAssessmentDto dto,
        Guid                currentUserId,
        CancellationToken   ct = default);

    /// <summary>Список бейджей навыков на конкретном профиле.</summary>
    Task<IReadOnlyList<ProfileBadgeDto>> GetBadgesAsync(
        Guid profileId,
        CancellationToken ct = default);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEPTION
// ═══════════════════════════════════════════════════════════════════════════

public sealed class AssessmentException : Exception
{
    public int StatusCode { get; }
    public AssessmentException(string message, int statusCode = 400)
        : base(message) => StatusCode = statusCode;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Сервис тестирования и верификации навыков Barnamaj.
///
/// Пороговое значение прохождения: <see cref="PassThreshold"/> = 80 %.
/// При прохождении автоматически создаётся/обновляется <see cref="ProfileSkillBadge"/>.
/// </summary>
public sealed class AssessmentService : IAssessmentService
{
    /// <summary>Минимальный процент правильных ответов для прохождения теста.</summary>
    private const decimal PassThreshold = 80m;

    private readonly AppDbContext                _db;
    private readonly ILogger<AssessmentService>  _logger;

    public AssessmentService(AppDbContext db, ILogger<AssessmentService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── GET SKILLS ────────────────────────────────────────────
    public async Task<IReadOnlyList<SkillDto>> GetSkillsAsync(CancellationToken ct = default)
    {
        // HasQueryFilter(s => s.IsActive) обеспечивает фильтрацию на уровне EF
        // Считаем вопросы отдельным подзапросом (EF не транслирует Count внутри Select+OrderBy)
        var skills = await _db.Skills
            .AsNoTracking()
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.Description,
                s.Category,
                QuestionCount = s.Questions.Count(q => q.IsActive),
            })
            .OrderBy(s => s.Category)
            .ThenBy(s => s.Name)
            .ToListAsync(ct);

        return skills.Select(s => new SkillDto(
            s.Id, s.Name, s.Description, s.Category, s.QuestionCount))
            .ToList();
    }

    // ── GET QUESTIONS ─────────────────────────────────────────
    public async Task<IReadOnlyList<QuestionDto>> GetQuestionsAsync(
        Guid skillId,
        int  count = 10,
        CancellationToken ct = default)
    {
        count = Math.Clamp(count, 1, 50);

        var skillExists = await _db.Skills.AnyAsync(s => s.Id == skillId, ct);
        if (!skillExists)
            throw new AssessmentException("Навык не найден.", 404);

        // Случайный порядок через NEWID() — заменим на правильную стратегию PostgreSQL
        var questions = await _db.Questions
            .AsNoTracking()
            .Where(q => q.SkillId == skillId && q.IsActive)
            .OrderBy(_ => EF.Functions.Random())   // RANDOM() в PostgreSQL
            .Take(count)
            .ToListAsync(ct);

        if (questions.Count == 0)
            throw new AssessmentException("По данному навыку пока нет вопросов.", 404);

        return questions.Select(q =>
        {
            // Десериализуем варианты; CorrectAnswerIndex скрыт
            var options = DeserializeOptions(q.OptionsJson);
            return new QuestionDto(q.Id, q.Text, options, q.Difficulty.ToString());
        }).ToList();
    }

    // ── SUBMIT ────────────────────────────────────────────────
    public async Task<AssessmentResultDto> SubmitAsync(
        SubmitAssessmentDto dto,
        Guid                currentUserId,
        CancellationToken   ct = default)
    {
        // 1. Проверяем профиль и права доступа
        var profile = await _db.Profiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.ProfileId, ct)
            ?? throw new AssessmentException("Профиль не найден.", 404);

        await EnsureProfileAccessAsync(currentUserId, profile, ct);

        // 2. Проверяем навык
        var skill = await _db.Skills
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == dto.SkillId, ct)
            ?? throw new AssessmentException("Навык не найден.", 404);

        // 3. Загружаем вопросы по присланным IDs
        var questionIds = dto.Answers.Select(a => a.QuestionId).Distinct().ToList();

        var questions = await _db.Questions
            .AsNoTracking()
            .Where(q => questionIds.Contains(q.Id) && q.SkillId == dto.SkillId && q.IsActive)
            .ToListAsync(ct);

        if (questions.Count == 0)
            throw new AssessmentException(
                "Ни один из указанных вопросов не относится к данному навыку.", 400);

        // 4. Подсчёт баллов
        var answerMap = dto.Answers.ToDictionary(a => a.QuestionId, a => a.SelectedIndex);
        var review    = new List<AnswerReviewDto>(questions.Count);
        int correct   = 0;

        foreach (var q in questions)
        {
            var hasAnswer = answerMap.TryGetValue(q.Id, out var selectedIdx);
            var isCorrect = hasAnswer && selectedIdx == q.CorrectAnswerIndex;
            if (isCorrect) correct++;

            review.Add(new AnswerReviewDto(
                q.Id,
                q.Text,
                q.CorrectAnswerIndex,
                hasAnswer ? selectedIdx : (byte)255,  // 255 = нет ответа
                isCorrect));
        }

        int     total   = questions.Count;
        decimal percent = total > 0 ? Math.Round((decimal)correct / total * 100, 2) : 0m;
        var     status  = percent >= PassThreshold ? AttemptStatus.Passed : AttemptStatus.Failed;

        // 5. Снимок ответов для хранения
        var answersSnapshot = JsonSerializer.Serialize(
            dto.Answers.Select(a => new { questionId = a.QuestionId, selectedIndex = a.SelectedIndex }));

        // 6. Сохраняем попытку + возможный бейдж в транзакции
        bool badgeAwarded = false;
        Guid attemptId    = Guid.Empty;

        await _db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var attempt = new AssessmentAttempt
            {
                ProfileId    = dto.ProfileId,
                SkillId      = dto.SkillId,
                AnswersJson  = answersSnapshot,
                CorrectCount = correct,
                TotalCount   = total,
                ScorePercent = percent,
                Status       = status,
                CompletedAt  = DateTime.UtcNow,
            };
            _db.AssessmentAttempts.Add(attempt);

            // 7. Выдаём / обновляем бейдж при прохождении
            if (status == AttemptStatus.Passed)
            {
                var existingBadge = await _db.ProfileSkillBadges
                    .FirstOrDefaultAsync(b => b.ProfileId == dto.ProfileId && b.SkillId == dto.SkillId, ct);

                if (existingBadge is null)
                {
                    _db.ProfileSkillBadges.Add(new ProfileSkillBadge
                    {
                        ProfileId  = dto.ProfileId,
                        SkillId    = dto.SkillId,
                        BestScore  = percent,
                        AchievedAt = DateTime.UtcNow,
                        UpdatedAt  = DateTime.UtcNow,
                    });
                    badgeAwarded = true;
                }
                else if (percent > existingBadge.BestScore)
                {
                    existingBadge.BestScore = percent;
                    existingBadge.UpdatedAt = DateTime.UtcNow;
                    // badgeAwarded = false — бейдж уже был, просто обновили рекорд
                }
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            attemptId = attempt.Id;
        });

        _logger.LogInformation(
            "Assessment completed: profile={ProfileId} skill={SkillId} score={Score}% status={Status}",
            dto.ProfileId, dto.SkillId, percent, status);

        return new AssessmentResultDto(
            AttemptId:    attemptId,
            ProfileId:    dto.ProfileId,
            SkillId:      dto.SkillId,
            SkillName:    skill.Name,
            CorrectCount: correct,
            TotalCount:   total,
            ScorePercent: percent,
            Status:       status.ToString(),
            BadgeAwarded: badgeAwarded,
            Review:       review);
    }

    // ── GET BADGES ────────────────────────────────────────────
    public async Task<IReadOnlyList<ProfileBadgeDto>> GetBadgesAsync(
        Guid profileId,
        CancellationToken ct = default)
    {
        return await _db.ProfileSkillBadges
            .AsNoTracking()
            .Where(b => b.ProfileId == profileId)
            .Include(b => b.Skill)
            .OrderByDescending(b => b.BestScore)
            .Select(b => new ProfileBadgeDto(
                b.SkillId,
                b.Skill.Name,
                b.Skill.Category,
                b.BestScore,
                b.AchievedAt))
            .ToListAsync(ct);
    }

    // ── HELPERS ───────────────────────────────────────────────

    /// <summary>
    /// Проверяет, что текущий пользователь имеет право сдавать тест от имени профиля.
    /// Individual — только сам пользователь.
    /// Company / Clan — активное членство любой роли.
    /// </summary>
    private async Task EnsureProfileAccessAsync(
        Guid    currentUserId,
        Profile profile,
        CancellationToken ct)
    {
        if (profile.AccountType == AccountType.Individual)
        {
            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == currentUserId, ct);

            if (user?.ProfileId != profile.Id)
                throw new AssessmentException(
                    "Вы не можете сдавать тест от имени чужого профиля.", 403);
        }
        else
        {
            var isMember = await _db.Memberships
                .AnyAsync(m =>
                    m.UserId    == currentUserId &&
                    m.ProfileId == profile.Id &&
                    m.Status    == MembershipStatus.Active, ct);

            if (!isMember)
                throw new AssessmentException(
                    "Вы не являетесь активным участником этого профиля.", 403);
        }
    }

    private IReadOnlyList<string> DeserializeOptions(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize question options. JSON: {Json}", json);
            return [];
        }
    }
}
