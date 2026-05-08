namespace Barnamaj.API.Entities;

/// <summary>
/// Роль пользователя в системе (глобальная).
/// Используется для авторизации на уровне API.
/// </summary>
public enum UserRole : byte
{
    /// <summary>Обычный участник платформы</summary>
    Member = 1,

    /// <summary>Модератор — только просмотр в admin-панели</summary>
    Moderator = 2,

    /// <summary>Старший администратор — редактирование везде кроме финансов</summary>
    SeniorAdmin = 3,

    /// <summary>Главный администратор — полный доступ включая финансы и роли</summary>
    HeadAdmin = 4,
}
