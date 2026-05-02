namespace Barnamaj.API.Entities;

/// <summary>
/// Роль пользователя в системе (глобальная).
/// Используется для авторизации на уровне API.
/// </summary>
public enum UserRole : byte
{
    /// <summary>Обычный участник платформы</summary>
    Member = 1,

    /// <summary>Модератор — дополнительные права управления контентом</summary>
    Moderator = 2,

    /// <summary>Администратор — полный доступ к системе</summary>
    Admin = 3
}
