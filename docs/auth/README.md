# Auth & Stats — Авторизация и счётчики

## Часть А: Уникальность email

### Статус: уже реализовано

Уникальный индекс на email существует в `UserConfiguration.cs`:

```csharp
builder.HasIndex(u => u.Email)
    .IsUnique()
    .HasDatabaseName("ix_users_email");
```

Дополнительно в `AuthService.RegisterAsync()` выполняется проверка `AnyAsync(u => u.Email == emailLower)` перед созданием пользователя.

Защита от race condition: при параллельной регистрации с одинаковым email, уникальный индекс PostgreSQL отклонит вторую попытку на уровне БД.

## Часть Б: Счётчики

### Backend API

**GET /api/stats** — публичный эндпоинт с кэшированием 60 секунд.

Файл: `Controllers/StatsController.cs`

Ответ:

```json
{
  "users": 150,
  "activeOrders": 42,
  "completedOrders": 87,
  "clans": 12,
  "companies": 8
}
```

Реализация:
- 5 параллельных COUNT запросов через `Task.WhenAll()`
- `IMemoryCache` с TTL 60 секунд
- `[ResponseCache(Duration = 60)]` для HTTP кэширования

### Frontend (лендинг)

Лендинг (`barnamaj-web/src/app/[lang]/page.tsx`) уже использует реальные данные из Supabase:
- `escrowTotal` — сумма из contracts
- `activeProjects` — count projects (open/in_progress)
- `verifiedTeams` — count profiles (role=client)
