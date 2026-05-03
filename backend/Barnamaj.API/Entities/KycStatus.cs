namespace Barnamaj.API.Entities;

/// <summary>
/// Уровень подтверждения личности пользователя.
///
/// None     — ничего не пройдено (только email).
/// Lite     — телефон подтверждён + ИИН валиден (локальная проверка).
/// Full     — пройдена проверка через KYC-провайдера (Sumsub).
/// Rejected — провайдер отклонил проверку.
/// </summary>
public enum KycStatus : byte
{
    None     = 0,
    Lite     = 1,
    Full     = 2,
    Rejected = 3,
}
