namespace Barnamaj.API.Entities;

/// <summary>
/// Тип аккаунта пользователя на платформе Barnamaj.
///
/// Individual — фрилансер или частное лицо.
/// Company    — юридическое лицо / организация.
/// Clan       — группа фрилансеров, работающих совместно
///              (собственная логика биллинга и ролей внутри группы).
/// </summary>
public enum AccountType : byte
{
    Individual = 1,
    Company    = 2,
    Clan       = 3
}
