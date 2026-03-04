namespace Barnamaj.API.Entities;

/// <summary>
/// Жизненный цикл проекта (ТЗ) на платформе Barnamaj.
///
///   Open       → InProgress  : Исполнитель принят
///   InProgress → Review      : Исполнитель сдал работу
///   Review     → Completed   : Заказчик принял
///   Review     → InProgress  : Заказчик вернул на доработку
///   *          → Cancelled   : Заказчик отменил (только при Open/InProgress)
/// </summary>
public enum ProjectStatus : byte
{
    /// <summary>Открытый заказ — принимаются заявки от исполнителей</summary>
    Open       = 0,

    /// <summary>Исполнитель выбран, работа в процессе</summary>
    InProgress = 1,

    /// <summary>Работа сдана, ожидает проверки заказчиком</summary>
    Review     = 2,

    /// <summary>Заказ выполнен и закрыт</summary>
    Completed  = 3,

    /// <summary>Заказ отменён заказчиком</summary>
    Cancelled  = 4,
}
