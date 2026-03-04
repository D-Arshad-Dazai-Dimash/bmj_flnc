namespace Barnamaj.API.Entities;

/// <summary>Итог попытки прохождения теста.</summary>
public enum AttemptStatus : byte
{
    Failed = 0,
    Passed = 1,
}
