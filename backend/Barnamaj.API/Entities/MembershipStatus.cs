namespace Barnamaj.API.Entities;

/// <summary>
/// Статус участия пользователя в группе (клане/компании).
///
/// Жизненный цикл приглашения:
///   → Pending → Active   (пользователь принял)
///   → Pending → Rejected (пользователь отклонил)
///   Active    → Left     (добровольный выход)
///   Active    → Kicked   (исключён владельцем/администратором)
/// </summary>
public enum MembershipStatus : byte
{
    /// <summary>Приглашение отправлено, ожидает ответа</summary>
    Pending  = 0,

    /// <summary>Пользователь является активным участником группы</summary>
    Active   = 1,

    /// <summary>Пользователь отклонил приглашение</summary>
    Rejected = 2,

    /// <summary>Пользователь добровольно покинул группу</summary>
    Left     = 3,

    /// <summary>Пользователь был исключён владельцем/администратором</summary>
    Kicked   = 4,
}
