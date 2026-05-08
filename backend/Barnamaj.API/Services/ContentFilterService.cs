namespace Barnamaj.API.Services;

/// <summary>
/// Простая фильтрация контента по списку запрещённых слов.
/// Список хранится в Data/forbidden_words.txt (одно слово/фраза на строку).
/// Строки, начинающиеся с #, и пустые строки игнорируются.
///
/// Пример использования:
///   var result = _contentFilter.Check(dto.Description);
///   if (!result.IsAllowed) return BadRequest(new { error = result.Reason });
/// </summary>
public interface IContentFilterService
{
    ContentFilterResult Check(string? text);
}

public record ContentFilterResult(bool IsAllowed, string? Reason = null);

public class ContentFilterService : IContentFilterService
{
    private readonly IReadOnlyList<string> _forbidden;

    public ContentFilterService(IWebHostEnvironment env)
    {
        var path = Path.Combine(env.ContentRootPath, "Data", "forbidden_words.txt");
        if (!File.Exists(path))
        {
            _forbidden = [];
            return;
        }

        _forbidden = File.ReadAllLines(path)
            .Select(l => l.Trim())
            .Where(l => l.Length > 0 && !l.StartsWith('#'))
            .Select(l => l.ToLowerInvariant())
            .ToList();
    }

    public ContentFilterResult Check(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return new(true);

        var lower = text.ToLowerInvariant();
        foreach (var word in _forbidden)
        {
            if (lower.Contains(word))
                return new(false, $"Текст содержит запрещённое выражение.");
        }
        return new(true);
    }
}
