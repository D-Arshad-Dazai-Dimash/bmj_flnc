# AUDIT_REPORT.md
# Детальный отчёт аудита проекта Barnamaj
# Дата: 2026-03-15

## Полный список API эндпоинтов

### Бекенд (.NET Core 8)

| # | Метод | Путь | Авторизация | Rate Limit | Описание |
|---|-------|------|-------------|------------|----------|
| 1 | POST | /api/auth/register | Нет | Global | Регистрация (email, password, name, accountType, bio) |
| 2 | POST | /api/auth/login | Нет | Global | Вход (email, password) → JWT токен |
| 3 | PATCH | /api/auth/profile | [Authorize] | Global | Обновление профиля (name, bio) |
| 4 | GET | /api/auth/me | [Authorize] | Global | Информация о текущем пользователе |
| 5 | GET | /api/health/live | Нет | Нет | Liveness probe (всегда 200) |
| 6 | GET | /api/health/ready | Нет | Нет | Readiness probe (проверяет БД) |
| 7 | GET | /api/assessment/skills | Нет | Global | Список доступных навыков |
| 8 | GET | /api/assessment/questions/{skillId} | Нет | Global | Вопросы для тестирования (count=1-50) |
| 9 | POST | /api/assessment/submit | [Authorize] | assessment-submit (5/5min) | Отправка ответов теста |
| 10 | GET | /api/assessment/badges/{profileId} | Нет | Global | Бейджи профиля |
| 11 | POST | /api/projects | [Authorize] | Global | Создать проект/заказ |
| 12 | GET | /api/projects/my | [Authorize] | Global | Мои проекты |
| 13 | GET | /api/projects/feed | Нет | Global | Лента проектов (page, pageSize) |
| 14 | POST | /api/projects/{id}/apply | [Authorize] | Global | Подать заявку на проект |
| 15 | GET | /api/profiles | Нет | Global | Поиск профилей (q=search) |
| 16 | POST | /api/profiles/create | [Authorize] | Global | Создать клан/компанию |
| 17 | POST | /api/profiles/{id}/invite | [Authorize] | Global | Пригласить пользователя |
| 18 | GET | /api/profiles/my-teams | [Authorize] | Global | Мои команды |

### Фронтенд API routes (Next.js)

| # | Метод | Путь | Описание |
|---|-------|------|----------|
| 1 | POST | /api/ai/tz | Генерация ТЗ через Anthropic Claude |

## Существующие тесты

### Бекенд
- **Статус**: Тестовый проект НЕ СОЗДАН
- **Фреймворк**: Нет (рекомендуется xUnit)
- **Покрытие**: 0%
- **Требуется**: Создать `tests/Barnamaj.API.Tests/` проект с xUnit

### Фронтенд
- **Статус**: Playwright настроен, тестов мало
- **Фреймворк**: Playwright 1.58.2
- **Конфиг**: `barnamaj-web/playwright.config.ts`
- **Покрытие**: Минимальное (E2E только)
- **Unit тесты**: НЕ НАСТРОЕНЫ (нет Jest/Vitest)

## Найденные проблемы производительности

### P1 — Критичные

1. **Нет `.Include()` в запросах EF Core**
   - Файл: `Services/ProjectService.cs`
   - Проблема: При загрузке проектов не используется `.Include()` для связанных сущностей, что может приводить к N+1 запросам при доступе к навигационным свойствам
   - Решение: Добавить `.Include(p => p.ClientProfile)` и т.д.

2. **Автоприменение миграций в Program.cs**
   - Файл: `Program.cs`
   - Проблема: `context.Database.Migrate()` выполняется при каждом запуске, увеличивая время старта
   - Решение: Вынести в отдельный шаг деплоя

3. **Нет кэширования на GET эндпоинтах**
   - Файлы: Все контроллеры
   - Проблема: GET /api/assessment/skills, GET /api/projects/feed и др. не используют `[ResponseCache]` или `IMemoryCache`
   - Решение: Добавить кэширование для read-heavy эндпоинтов

### P2 — Средние

4. **Изображения без lazy loading**
   - Файлы: Компоненты лендинга
   - Проблема: Некоторые `<img>` теги не имеют `loading="lazy"`
   - Решение: Заменить на `<Image>` из Next.js или добавить атрибут

5. **Bundle size**
   - Проблема: framer-motion (тяжёлая библиотека) импортируется глобально
   - Решение: Использовать dynamic import / tree-shaking

6. **MemoryCache с лимитом 1024**
   - Файл: `ServiceExtensions.cs`
   - Проблема: Для продакшна малый размер кэша, нет Redis
   - Решение: Перейти на Redis для распределённого кэша

### P3 — Низкие

7. **Serilog файловый логгер без rotation limit**
   - Файл: `Program.cs`
   - Проблема: 30-дней ротация, но нет лимита на общий размер
   - Решение: Добавить `fileSizeLimitBytes` и `retainedFileCountLimit`

## Найденные баги

### B1 — Критичные

1. **Двойная система авторизации не синхронизирована**
   - Supabase Auth и JWT бекенда — независимые сессии
   - Пользователь может быть залогинен в одной системе и разлогинен в другой
   - Профили в Supabase и в .NET БД могут расходиться

2. **Нет проверки уникальности email на уровне БД (Supabase)**
   - В Supabase Auth email уникален, но в `public.profiles` — нет уникального индекса на email
   - Возможен рассинхрон

### B2 — Средние

3. **localStorage токен не обновляется при истечении**
   - Файл: `AuthContext.tsx`
   - JWT токен хранится в localStorage без механизма refresh
   - При истечении пользователь получает 401, но UI не перенаправляет на логин автоматически

4. **Отсутствует валидация HTML в Bio/Description**
   - Файлы: `AuthService.cs`, Supabase profiles
   - Возможна XSS инъекция через bio поле
   - Решение: Добавить HtmlSanitizer или strip HTML tags

5. **Нет rate limit на /api/auth/login**
   - Brute-force атака на пароли возможна (только глобальный лимит 100/10s)
   - Решение: Добавить отдельную policy для логина (5 попыток / 15 минут)

### B3 — Низкие

6. **CORS разрешает credentials без strict origin**
   - `barnamaj.dev` — может не существовать, но указан в CORS

7. **pgAdmin доступен без дополнительной защиты**
   - Порт 5050 открыт, пароль в `.env`

## Устаревшие или лишние зависимости

### Бекенд (NuGet)
- Все пакеты актуальны для .NET 8, лишних не обнаружено
- **Рекомендация**: Обновить до последних patch-версий EF Core 8.0.x

### Фронтенд (npm)
| Пакет | Статус | Примечание |
|-------|--------|------------|
| @anthropic-ai/sdk 0.78.0 | Используется | В `/api/ai/tz` route |
| framer-motion 11.15.0 | Используется | Тяжёлый, но нужен для анимаций |
| class-variance-authority 0.7.1 | Используется | Для вариантов UI компонентов |
| sonner 2.0.7 | Используется | Toast уведомления |
| next-themes 0.4.6 | Используется | Тёмная тема |

### Устаревший фронтенд
- **Папка**: `barnamaj-frontend/`
- **Статус**: НЕ ИСПОЛЬЗУЕТСЯ
- **Рекомендация**: Удалить или заархивировать для экономии места

## Архитектурные замечания

1. **Две базы данных**: Docker PostgreSQL (порт 5432) для .NET + Supabase PostgreSQL (порт 54322) для фронтенда — данные не синхронизированы
2. **Дублирование сущностей**: User/Profile существуют в обеих БД
3. **Нет единого источника истины**: Для одних операций используется бекенд API, для других — прямое обращение к Supabase
4. **Нет тестового проекта**: Бекенд не имеет ни одного теста
5. **Нет CI/CD**: Отсутствует конфигурация GitHub Actions / другой CI системы
6. **Swagger доступен в production**: `app.UseSwagger()` без ограничения по Environment
