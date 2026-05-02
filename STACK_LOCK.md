# STACK_LOCK.md
# Зафиксированный стек проекта. НЕ ИЗМЕНЯТЬ без согласования.
# Claude Code обязан читать этот файл перед каждым этапом.

## Бекенд
- Язык и версия: C# / .NET 8.0
- Фреймворк: ASP.NET Core 8
- Папка: `backend/Barnamaj.API/`
- Точка входа: `Program.cs`
- Запуск: `dotnet run --project backend/Barnamaj.API`
- Решение: `BJ.sln`

## Фронтенд
- Фреймворк и версия: Next.js 15.1.7 + React 19.0.0
- Язык: TypeScript 5
- Папка: `frontend/`
- Запуск: `npm run dev` (Turbopack, порт 3000)
- Сборка: `npm run build`
- Устаревший фронтенд: `barnamaj-frontend/` (УДАЛЁН)

## База данных
- Тип: PostgreSQL 16 (Docker)
- ORM (бекенд): Entity Framework Core 8.0.0 (Code-first, snake_case naming)
- ORM (фронтенд): Supabase PostgREST (Row-Level Security)
- Как создать миграцию (EF Core): `dotnet ef migrations add <Name> --project backend/Barnamaj.API`
- Как применить миграцию (EF Core): `dotnet ef database update --project backend/Barnamaj.API`
- Как создать миграцию (Supabase): создать файл в `frontend/supabase/migrations/` и `supabase db push`
- Docker: `docker-compose up -d db` (порт 5432)
- Supabase Local: `supabase start` (порт 54321/54322)

## Конфигурация и секреты
- Механизм (бекенд): `appsettings.json` + `appsettings.Development.json`
- Механизм (фронтенд): `.env.local` (Next.js)
- Файл для разработки (бекенд): `backend/Barnamaj.API/appsettings.Development.json`
- Файл для разработки (фронтенд): `frontend/.env.local`
- Шаблон: `.env.example` (корень)
- Как добавить новый ключ (бекенд):
  1. Добавить в `appsettings.json` (с placeholder)
  2. Добавить в `appsettings.Development.json` (с dev значением)
  3. Прочитать: `builder.Configuration["SectionName:KeyName"]`
- Как добавить новый ключ (фронтенд):
  1. Добавить в `.env.local`: `NEXT_PUBLIC_KEY_NAME=value`
  2. Прочитать: `process.env.NEXT_PUBLIC_KEY_NAME`

## Тесты
- Бекенд тест-фреймворк: НЕ НАСТРОЕН (нет тестового проекта; рекомендуется xUnit)
- Фронтенд тест-фреймворк: Playwright 1.58.2 (E2E)
- Команда запуска E2E: `npx playwright test --project=chromium-stress --workers=1` (из `frontend/`)
- Паттерн именования тест-файлов (бекенд): `*.Tests.cs` (xUnit, при создании)
- Паттерн именования тест-файлов (фронтенд): `*.spec.ts` (Playwright)
- E2E спеки: `e2e/*.spec.ts` — 7 файлов, `repeatEach: 10`, 220 тестов
- E2E bypass: `E2E_TEST=true` в env → middleware.ts пропускает Supabase Auth проверку
- webServer в playwright.config.ts автозапускает `npm run dev` с `E2E_TEST=true`
- Моки в тестах: `addInitScript` (localStorage: `barnamaj_token`, `barnamaj_user`) + `page.route` для API/Supabase вызовов

## Авторизация
- Механизм (бекенд): JWT Bearer (кастомный, BCrypt хэширование паролей)
- Механизм (фронтенд): Supabase Auth (PKCE flow) + Legacy JWT fallback
- Как защитить новый эндпоинт: `[Authorize]` атрибут на контроллере/методе
- Как защитить по роли: `[Authorize(Roles = "Admin")]`
- Как получить текущего пользователя:
  ```csharp
  var userId = User.FindFirstValue("sub") ?? throw new UnauthorizedAccessException();
  ```
- Система ролей (бекенд): Member, Moderator, Admin (enum `UserRole`)
- Система ролей (фронтенд/Supabase): freelancer, client (в таблице profiles)
- Как проверить роль:
  ```csharp
  [Authorize(Roles = "Admin,Moderator")]
  ```

## API
- Базовый префикс: `/api/v1/[controller]` (версионирование через URL)
- Формат успешного ответа: прямой объект / массив (без обёртки)
- Формат ошибки: `{ "error": "сообщение", "timestamp": "ISO 8601" }`
- Пример существующего контроллера: `backend/Barnamaj.API/Controllers/AuthController.cs`
- Базовый контроллер: `BaseApiController` (все наследуют)

## Все существующие маршруты API

### Бекенд (.NET)
| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| POST | /api/auth/register | - | Регистрация |
| POST | /api/auth/login | - | Вход (rate limit: 5 req/15 min/IP) |
| POST | /api/auth/logout | [Authorize] | Выйти (очистить cookies) |
| POST | /api/auth/refresh | - | Обновить access token по refresh cookie |
| PATCH | /api/auth/profile | [Authorize] | Обновить профиль |
| GET | /api/auth/me | [Authorize] | Текущий пользователь |
| GET | /api/health/live | - | Liveness probe |
| GET | /api/health/ready | - | Readiness probe |
| GET | /api/assessment/skills | - | Список навыков |
| GET | /api/assessment/questions/{skillId} | - | Вопросы теста |
| POST | /api/assessment/submit | [Authorize] | Отправить ответы (rate limit: 5 req/5 min) |
| GET | /api/assessment/badges/{profileId} | - | Бейджи профиля |
| POST | /api/projects | [Authorize] | Создать проект |
| GET | /api/projects/my | [Authorize] | Мои проекты (клиент) |
| GET | /api/projects/feed | - | Лента проектов (публичная) |
| PATCH | /api/projects/{id}/status | [Authorize] | Изменить статус (Cancelled/Completed) |
| POST | /api/projects/{id}/apply | [Authorize] | Подать заявку на проект |
| GET | /api/profiles | - | Поиск профилей |
| POST | /api/profiles/create | [Authorize] | Создать клан/компанию |
| POST | /api/profiles/{id}/invite | [Authorize] | Пригласить в команду |
| GET | /api/profiles/my-teams | [Authorize] | Мои команды |

### Фронтенд API routes (Next.js)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | /api/ai/tz | Генерация ТЗ через Anthropic SDK |
| POST | /api/ai-manager/... | AI Manager (отдельный модуль) |
| POST | /api/attestation/... | Аттестация (отдельный модуль) |
| POST | /api/payments/... | Платежи (отдельный модуль) |
| POST | /api/supervision/... | Супервизия (отдельный модуль) |

## Структура проекта
```
BJ/
├── .env.example                # Шаблон переменных окружения
├── BJ.sln                      # VS Solution
├── CLAUDE.md                   # Правила для Claude Code
├── STACK_LOCK.md               # Этот файл — зафиксированный стек
├── TASKS.md                    # Задачник
├── README.md                   # Документация
├── docker-compose.yml          # Docker (PostgreSQL, pgAdmin)
├── init-scripts/01_init.sql    # SQL seed
├── seed_skills.sql             # Seed навыков
├── verify.sql                  # Верификация SQL
├── requests.http               # HTTP тесты
├── backend/Barnamaj.API/           # Бекенд
│   ├── Program.cs
│   ├── Controllers/            # 5 контроллеров: Auth, Projects, Profiles, Assessment, Health
│   ├── Services/               # ProjectService, AuthService, AssessmentService + Extensions
│   ├── Data/                   # AppDbContext + Migrations
│   ├── Entities/               # Entity модели
│   ├── DTOs/                   # DTO + FluentValidation
│   └── wwwroot/                # Статика
└── frontend/               # Фронтенд (активный)
    ├── src/app/[lang]/         # Страницы (i18n: ru, en, kz)
    │   ├── dashboard/          # Защищённые страницы дашборда
    │   │   ├── page.tsx        # Обзор (stats через Supabase — рефактор pending)
    │   │   ├── create-project/ # Создать проект (→ backend API)
    │   │   ├── projects/       # Мои проекты (→ backend API)
    │   │   ├── orders/         # Лента заказов (→ backend API)
    │   │   ├── contracts/      # Контракты (Supabase — рефактор pending)
    │   │   └── clans/          # Кланы (Supabase — рефактор pending)
    │   ├── auth/               # Страницы авторизации
    │   ├── escrow/             # Эскроу (публичная)
    │   ├── pricing/            # Тарифы (публичная)
    │   ├── safety/             # Безопасность (публичная)
    │   └── clans/              # Кланы (публичная)
    ├── src/app/api/            # Next.js API routes
    │   └── ai/tz/              # Генерация ТЗ через Anthropic
    ├── src/components/         # Компоненты
    ├── src/context/            # AuthContext (двойная auth: Supabase + Legacy JWT)
    ├── src/lib/                # api.ts (backend client), supabase.ts, utils.ts
    ├── src/middleware.ts       # Locale + Auth guard (E2E_TEST=true → bypass)
    ├── e2e/                    # Playwright E2E тесты (7 файлов, 220 тестов)
    ├── supabase/               # Config + миграции
    └── public/                 # Статические файлы
```

## Ключевые зависимости (бекенд NuGet)
- Microsoft.EntityFrameworkCore 8.0.0
- Npgsql.EntityFrameworkCore.PostgreSQL 8.0.0
- EFCore.NamingConventions 8.0.0
- Microsoft.AspNetCore.Authentication.JwtBearer 8.0.0
- BCrypt.Net-Next 4.0.3
- FluentValidation.AspNetCore 11.3.0
- Serilog.AspNetCore 8.0.0
- Swashbuckle.AspNetCore 6.5.0
- AspNetCore.HealthChecks.NpgSql 8.0.0

## Ключевые зависимости (фронтенд npm)
- next 15.1.7
- react / react-dom 19.0.0
- typescript 5
- tailwindcss 3.4.17
- @supabase/supabase-js 2.98.0 / @supabase/ssr 0.8.0
- framer-motion 11.15.0
- lucide-react (иконки)
- class-variance-authority 0.7.1
- clsx 2.1.1 / tailwind-merge 2.6.0
- sonner 2.0.7 (уведомления)
- next-themes 0.4.6 (тёмная тема)
- @anthropic-ai/sdk 0.78.0
- @playwright/test 1.58.2

## Важные замечания
1. **Двойная авторизация**: Supabase Auth (фронтенд) + Custom JWT (бекенд) — архитектурный долг, унификация pending
2. **Два PostgreSQL**: Docker (порт 5432, для .NET) + Supabase local (порт 54322) — данные НЕ синхронизированы
3. **Таблицы дублируются**: profiles, projects есть и в EF Core, и в Supabase — источник истины по контексту (write path → backend API)
4. **Legacy токены в localStorage**: `barnamaj_token` / `barnamaj_user` — NОТ httpOnly cookies, известная уязвимость
5. **Soft-delete без аудита**: DeletedAt есть, DeletedByUserId нет
6. **Миграции автоприменяются**: `context.Database.Migrate()` в Program.cs при старте
7. **i18n**: 3 локали (ru, en, kz) через динамический роутинг `[lang]`
8. **Тёмная тема**: Поддерживается через next-themes (class-based)
9. **CORS**: Разрешены только localhost:3000 и barnamaj.dev
10. **Rate Limiting**: Глобально 100 req/10s; auth-login 5 req/15 min/IP; assessment-submit 5 req/5 min
11. **Swagger**: Доступен только в Development окружении (`/swagger`)
12. **Backend-first write path**: все создание/изменение данных идут через `.NET API`, прямые Supabase write-запросы из страниц запрещены
13. **E2E стратегия**: `E2E_TEST=true` в env → middleware.ts пропускает Supabase; браузерный слой мокируется через `addInitScript` + `page.route`
14. **Дизайн-система**: тёмная cyber/neon эстетика, акцент `#7c3aed` (purple), cyan glow, фоны `#050508`/`#0c0c12`, шрифты Inter + JetBrains Mono, glassmorphism, rounded-xl
