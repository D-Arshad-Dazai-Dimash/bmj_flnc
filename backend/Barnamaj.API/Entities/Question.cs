namespace Barnamaj.API.Entities;

/// <summary>
/// Вопрос теста навыков.
///
/// Правило безопасности: поле <see cref="CorrectAnswerIndex"/> НИКОГДА
/// не возвращается через API — только используется сервисом при проверке ответов.
/// </summary>
public class Question
{
    // ── Идентификатор ────────────────────────────────────────
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── Привязка к навыку ────────────────────────────────────
    public Guid  SkillId { get; set; }
    public Skill Skill   { get; set; } = null!;

    // ── Содержание вопроса ───────────────────────────────────
    /// <summary>Текст вопроса</summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Варианты ответов в виде JSON-массива строк.
    /// Пример: ["Вариант A", "Вариант B", "Вариант C", "Вариант D"]
    /// Хранится как PostgreSQL jsonb.
    /// </summary>
    public string OptionsJson { get; set; } = "[]";

    /// <summary>
    /// 0-based индекс правильного ответа в массиве OptionsJson.
    /// ⛔ Не отдаётся клиенту ни в одном публичном эндпоинте.
    /// </summary>
    public byte CorrectAnswerIndex { get; set; }

    // ── Метаданные ───────────────────────────────────────────
    public QuestionDifficulty Difficulty { get; set; } = QuestionDifficulty.Medium;

    /// <summary>Деактивированные вопросы не выбираются при формировании теста</summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
