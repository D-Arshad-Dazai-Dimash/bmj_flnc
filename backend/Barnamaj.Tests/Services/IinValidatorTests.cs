using Barnamaj.API.Services;
using Xunit;

namespace Barnamaj.Tests.Services;

/// <summary>
/// Тесты валидатора РК ИИН.
/// </summary>
public class IinValidatorTests
{
    [Theory]
    // Известный валидный ИИН: 1990-01-01, муж, 19xx (7-я цифра 3); контроль 1 по формуле РК.
    [InlineData("900101345671")]
    public void IsValid_AcceptsKnownGoodIins(string iin)
    {
        Assert.True(IinValidator.IsValid(iin), $"Expected {iin} to be valid");
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("12345")]                     // слишком короткий
    [InlineData("1234567890123")]             // слишком длинный
    [InlineData("90010134567a")]              // буква
    [InlineData("900101345670")]              // неверная контрольная сумма (правильная 1)
    [InlineData("000000000000")]              // 7-я=0 запрещена + невалидная дата
    [InlineData("900101945671")]              // 7-я цифра 9 — запрещено (диапазон 1..8)
    public void IsValid_RejectsInvalidIins(string? iin)
    {
        Assert.False(IinValidator.IsValid(iin));
    }

    [Fact]
    public void IsValid_RejectsFutureBirthDate()
    {
        // 7-я цифра 6 = 2050-2099 (жен. 21 век), '99' → 2099-01-01 (в будущем).
        Assert.False(IinValidator.IsValid("990101612345"));
    }
}
