namespace Barnamaj.API.Entities;

/// <summary>
/// Роль пользователя внутри клана или компании.
/// Определяет права участника в конкретной группе.
/// </summary>
public enum MembershipRole : byte
{
    /// <summary>Рядовой участник</summary>
    Member  = 1,

    /// <summary>Администратор внутри группы</summary>
    Admin   = 2,

    /// <summary>Владелец/основатель клана или компании</summary>
    Owner   = 3
}
