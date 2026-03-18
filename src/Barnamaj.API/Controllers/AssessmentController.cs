using Barnamaj.API.DTOs.Assessment;
using Barnamaj.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace Barnamaj.API.Controllers;

/// <summary>
/// Тестирование и верификация навыков программистов.
///
/// Маршруты:
///   GET  /api/assessment/skills                       — список навыков (публично)
///   GET  /api/assessment/questions/{skillId}?count=10 — вопросы теста (публично)
///   POST /api/assessment/submit                       — сдача теста   [Authorize]
///   GET  /api/assessment/badges/{profileId}           — бейджи профиля (публично)
/// </summary>
[ApiController]
[Route("api/assessment")]
public sealed class AssessmentController : ControllerBase
{
    private readonly IAssessmentService _svc;

    public AssessmentController(IAssessmentService svc) => _svc = svc;

    // Достаём sub (userId) из JWT — безопасный вариант без ! оператора
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("JWT: claim 'sub' missing."));

    // ── GET /api/assessment/skills ────────────────────────────
    /// <summary>Список доступных навыков для тестирования.</summary>
    [HttpGet("skills")]
    [AllowAnonymous]
    [ResponseCache(Duration = 3600)]
    [ProducesResponseType<IReadOnlyList<SkillDto>>(200)]
    public async Task<IActionResult> GetSkills(CancellationToken ct)
    {
        var result = await _svc.GetSkillsAsync(ct);
        return Ok(result);
    }

    // ── GET /api/assessment/questions/{skillId} ───────────────
    /// <summary>
    /// Случайные вопросы по навыку для прохождения теста.
    /// Не содержит правильных ответов — они раскрываются только после сдачи.
    /// </summary>
    /// <param name="skillId">ID навыка</param>
    /// <param name="count">Количество вопросов (1–50, по умолчанию 10)</param>
    [HttpGet("questions/{skillId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType<IReadOnlyList<QuestionDto>>(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetQuestions(
        Guid skillId,
        [FromQuery] int count = 10,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _svc.GetQuestionsAsync(skillId, count, ct);
            return Ok(result);
        }
        catch (AssessmentException ex) when (ex.StatusCode == 404)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    // ── POST /api/assessment/submit ───────────────────────────
    /// <summary>
    /// Отправка ответов теста.
    /// Возвращает результат с детальным разбором ответов и правильными индексами.
    /// </summary>
    [HttpPost("submit")]
    [Authorize]
    [EnableRateLimiting("assessment-submit")]
    [ProducesResponseType<AssessmentResultDto>(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Submit(
        [FromBody] SubmitAssessmentDto dto,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _svc.SubmitAsync(dto, CurrentUserId, ct);
            return Ok(result);
        }
        catch (AssessmentException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    // ── GET /api/assessment/badges/{profileId} ────────────────
    /// <summary>Список верифицированных навыков (бейджей) профиля.</summary>
    [HttpGet("badges/{profileId:guid}")]
    [AllowAnonymous]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "profileId" })]
    [ProducesResponseType<IReadOnlyList<ProfileBadgeDto>>(200)]
    public async Task<IActionResult> GetBadges(
        Guid profileId,
        CancellationToken ct = default)
    {
        var result = await _svc.GetBadgesAsync(profileId, ct);
        return Ok(result);
    }
}
