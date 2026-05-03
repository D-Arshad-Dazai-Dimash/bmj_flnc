namespace Barnamaj.API.Services;

/// <summary>
/// Локальная валидация ИИН (Индивидуальный Идентификационный Номер) РК.
///
/// Алгоритм:
///   1. Длина ровно 12 цифр.
///   2. 7-я цифра кодирует век и пол:
///        1, 2 — XIX век;  3, 4 — XX век;  5, 6 — XXI век.
///   3. Контрольная цифра (12-я):
///        a) умножить первые 11 цифр на веса w1 = [1..11], сложить, взять mod 11.
///        b) если результат = 10 — повторить с весами
///           w2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2].
///        c) если снова = 10 — ИИН недействителен.
///        d) иначе — результат должен совпадать с 12-й цифрой.
/// </summary>
public static class IinValidator
{
    private static readonly int[] W1 = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 };
    private static readonly int[] W2 = { 3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2 };

    public static bool IsValid(string? iin)
    {
        if (string.IsNullOrWhiteSpace(iin) || iin.Length != 12)
            return false;

        var digits = new int[12];
        for (var i = 0; i < 12; i++)
        {
            if (!char.IsDigit(iin[i])) return false;
            digits[i] = iin[i] - '0';
        }

        var century = digits[6];
        if (century < 1 || century > 6) return false;

        var checksum = Mod11(digits, W1);
        if (checksum == 10)
        {
            checksum = Mod11(digits, W2);
            if (checksum == 10) return false;
        }
        return checksum == digits[11];
    }

    private static int Mod11(int[] digits, int[] weights)
    {
        var sum = 0;
        for (var i = 0; i < 11; i++)
            sum += digits[i] * weights[i];
        return sum % 11;
    }
}
