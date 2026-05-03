namespace Barnamaj.API.Services;

/// <summary>
/// Валидация казахстанского ИИН (12 цифр) по правилам Комитета по статистике РК.
///
/// Проверки:
///   1. Ровно 12 цифр.
///   2. Первые 6 цифр — корректная дата рождения (YYMMDD), 7-я — век/пол.
///   3. Контрольный разряд (12-я цифра) совпадает с расчётным по двум схемам весов.
///
/// ВАЖНО: эта проверка валидирует только ФОРМАТ. Принадлежность ИИН реальному
/// человеку проверяется только через интеграцию с ГБД ФЛ (eGov / Sumsub / Veriff).
/// </summary>
public static class IinValidator
{
    private static readonly int[] Weights1 = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 };
    private static readonly int[] Weights2 = { 3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2 };

    public static bool IsValid(string? iin)
    {
        if (string.IsNullOrWhiteSpace(iin) || iin.Length != 12) return false;
        if (!iin.All(char.IsDigit)) return false;

        var d = iin.Select(c => c - '0').ToArray();

        // ── 1. 7-я цифра: век/пол (1..6 для 19-21 века; 7-8 — 22, редко) ─
        var centuryGender = d[6];
        if (centuryGender < 1 || centuryGender > 8) return false;

        // ── 2. Дата рождения ────────────────────────────────────────────
        if (!TryParseBirthDate(d, out _)) return false;

        // ── 3. Контрольная цифра ────────────────────────────────────────
        var s1 = 0;
        for (var i = 0; i < 11; i++) s1 += d[i] * Weights1[i];
        var check = s1 % 11;

        if (check == 10)
        {
            var s2 = 0;
            for (var i = 0; i < 11; i++) s2 += d[i] * Weights2[i];
            check = s2 % 11;
            if (check == 10) return false; // невозможный ИИН
        }

        return check == d[11];
    }

    private static bool TryParseBirthDate(int[] d, out DateOnly date)
    {
        date = default;

        var century = d[6] switch
        {
            1 or 2 => 1800,
            3 or 4 => 1900,
            5 or 6 => 2000,
            7 or 8 => 2100,
            _      => -1
        };
        if (century < 0) return false;

        var year  = century + d[0] * 10 + d[1];
        var month = d[2] * 10 + d[3];
        var day   = d[4] * 10 + d[5];

        if (month is < 1 or > 12) return false;
        if (day is < 1 or > 31) return false;

        try
        {
            date = new DateOnly(year, month, day);
            // Не позволяем будущие даты и слишком старые (защита от бессмысленных ИИН).
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (date > today) return false;
            if (year < 1900) return false;
            return true;
        }
        catch
        {
            return false;
        }
    }
}
