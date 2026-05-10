namespace Barnamaj.API.Entities;

/// <summary>
/// Диалог между двумя профилями (1:1).
///
/// Уникальность пары: всегда нормализуем порядок (Profile1Id &lt; Profile2Id),
/// чтобы один тред существовал ровно один раз — упрощает поиск без LINQ-OR.
///
/// ProjectId опционален и означает, что тред был автоматически создан
/// при отклике на проект (или предложении проекта). Это нужно, чтобы
/// заказчик в карточке проекта мог увидеть всех откликнувшихся.
/// </summary>
public class ChatThread
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Нормализованная пара: Profile1Id всегда меньше Profile2Id (по Guid.CompareTo).
    public Guid Profile1Id { get; set; }
    public Guid Profile2Id { get; set; }

    public Profile Profile1 { get; set; } = null!;
    public Profile Profile2 { get; set; } = null!;

    /// <summary>Проект, из которого создан тред (опционально).</summary>
    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Последняя активность (для сортировки).</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Когда Profile1 прочитал тред в последний раз (UTC).</summary>
    public DateTime? Profile1ReadAt { get; set; }

    /// <summary>Когда Profile2 прочитал тред в последний раз (UTC).</summary>
    public DateTime? Profile2ReadAt { get; set; }

    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}
