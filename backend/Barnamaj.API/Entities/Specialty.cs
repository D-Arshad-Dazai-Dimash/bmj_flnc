namespace Barnamaj.API.Entities;

/// <summary>
/// Горизонтальная специализация пользователя.
/// Даёт доступ к конкретной области без повышения системной роли UserRole.
/// HeadAdmin/SeniorAdmin имеют доступ ко всему независимо от специализации.
/// </summary>
public enum Specialty : byte
{
    KycReviewer      = 1,  // проверка KYC-документов
    FinanceManager   = 2,  // кошельки и транзакции
    ContentModerator = 3,  // проекты, тексты, жалобы
    SupportAgent     = 4,  // просмотр чатов, тикеты
    TechOps          = 5,  // технадзор, инфраструктура
    Auditor          = 6,  // readonly доступ ко всему
}
