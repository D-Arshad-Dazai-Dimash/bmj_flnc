using System.Text.RegularExpressions;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT REDACTION
// ═══════════════════════════════════════════════════════════════════════════
//
// Принцип: всё, что в чате выглядит как личный контакт (телефон, email,
// telegram/whatsapp/instagram-handle, ссылка на мессенджер), заменяется на
// пометку «[скрыто: контакт]». Платформа удерживает коммуникацию у себя,
// чтобы предотвратить отток сделок «мимо кассы».
//
// Это compromise между UX и защитой:
//  - чистые регексы закрывают ~80% попыток;
//  - умные обходы (слова прописью, картинки, ZWJ) — закрываются модерацией;
//  - редактируем, а не блокируем: пользователю видно что произошло.
//
// ВАЖНО: фильтр НЕ применяется к системным сообщениям и к сообщениям,
// которые сервис отправляет от имени бэкенда.
// ═══════════════════════════════════════════════════════════════════════════

public sealed record RedactionResult(string Text, int Hits, IReadOnlyList<string> Categories)
{
    public bool WasRedacted => Hits > 0;
}

public interface IContactRedactionService
{
    RedactionResult Redact(string input);
}

public sealed class ContactRedactionService : IContactRedactionService
{
    private const string PLACEHOLDER = "[скрыто: контакт]";

    // ── Patterns ─────────────────────────────────────────────────────────────
    // Для всех паттернов: IgnoreCase + Compiled.

    /// <summary>Email: foo@bar.baz, foo (at) bar [dot] baz.</summary>
    private static readonly Regex EmailRx = new(
        @"\b[a-z0-9._%+\-]+\s*(?:@|\(at\)|\[at\])\s*[a-z0-9.\-]+\s*(?:\.|\(dot\)|\[dot\])\s*[a-z]{2,}\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Телефон: международные форматы, +7, 8-, разделители (-, пробел, ., скобки),
    /// допускает 7..15 цифр в группе.
    /// </summary>
    private static readonly Regex PhoneRx = new(
        @"(?:(?:\+|00)\d{1,3}[\s\-\.\(\)]*)?(?:\d[\s\-\.\(\)]*){7,15}",
        RegexOptions.Compiled);

    /// <summary>Telegram: @handle (5+ симв), t.me/, telegram.me/, tg://.</summary>
    private static readonly Regex TelegramRx = new(
        @"(?:t(?:elegram)?\.me\/[a-z0-9_]{3,}|tg:\/\/[^\s]+|(?<![a-z0-9])@[a-z][a-z0-9_]{4,})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>WhatsApp: wa.me/, whatsapp.com/, +7…?text= и пр.</summary>
    private static readonly Regex WhatsAppRx = new(
        @"(?:wa\.me\/|whatsapp\.com\/|api\.whatsapp\.com\/)[^\s]+",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>Instagram: instagram.com/handle, ig: handle.</summary>
    private static readonly Regex InstagramRx = new(
        @"(?:instagram\.com\/[a-z0-9._]{2,}|\bi(?:nsta|nstagram|g)\s*[:\-]\s*@?[a-z0-9._]{3,})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>Generic URL: http(s):// и www.</summary>
    private static readonly Regex UrlRx = new(
        @"(?:https?:\/\/|www\.)[^\s]+",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Слова-маркеры намерения уйти с платформы: «пиши в вотсап», «телега»,
    /// «дискорд @», «звони на номер», «email». Не редактируем — только
    /// поднимаем флаг для модерации.
    /// </summary>
    private static readonly Regex IntentRx = new(
        @"\b(вотс?ап|whats?app|телега|telegram|телеграмм?|инст(а|аграм)|instagram|ватсап|воцап|дискорд|discord|вайбер|viber|почт[аеу]|email|e-?mail|номер\s+телефона|позвон[ие]те?|звон[ие]те?|пиш[ие]те?\s+в|свяж[ие]те?ся\s+вне\s+платформы|вне\s+(сайта|платформы))\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public RedactionResult Redact(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return new RedactionResult(input ?? string.Empty, 0, Array.Empty<string>());

        var hits = 0;
        var categories = new List<string>();
        var text = input;

        text = ReplaceAndCount(text, EmailRx,     "email",     ref hits, categories);
        text = ReplaceAndCount(text, UrlRx,       "url",       ref hits, categories);
        text = ReplaceAndCount(text, TelegramRx,  "telegram",  ref hits, categories);
        text = ReplaceAndCount(text, WhatsAppRx,  "whatsapp",  ref hits, categories);
        text = ReplaceAndCount(text, InstagramRx, "instagram", ref hits, categories);
        text = ReplaceAndCount(text, PhoneRx,     "phone",     ref hits, categories, minDigits: 7);

        // Маркер намерения — не редактируем, но если найден И редакций ещё нет,
        // пишем категорию в audit (полезно модератору при ревью).
        if (IntentRx.IsMatch(text) && !categories.Contains("intent"))
            categories.Add("intent");

        return new RedactionResult(text, hits, categories);
    }

    private static string ReplaceAndCount(
        string input, Regex rx, string category, ref int hits, List<string> categories, int minDigits = 0)
    {
        var localHits = 0;
        var result = rx.Replace(input, m =>
        {
            if (minDigits > 0)
            {
                var digits = m.Value.Count(char.IsDigit);
                if (digits < minDigits) return m.Value;
            }
            localHits++;
            return PLACEHOLDER;
        });

        if (localHits > 0)
        {
            hits += localHits;
            if (!categories.Contains(category)) categories.Add(category);
        }
        return result;
    }
}
