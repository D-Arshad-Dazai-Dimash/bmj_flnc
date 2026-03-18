# 📋 ЗАДАЧНИК — Автономные промпты для Claude Code

> Каждый промпт полностью самодостаточен.
> Claude Code сам определяет стек, устанавливает зависимости, создаёт файлы, пишет тесты.
> Человек только запускает промпт и принимает результат.

---

## 🗂️ ЭТАПЫ

| # | Название | Статус |
|---|----------|--------|
| **0** | **Аудит и фиксация стека** | ⬜ |
| 1 | Производительность | ⬜ |
| 2 | Чистка зависимостей | ⬜ |
| 3 | БД: авторизация и счётчики | ⬜ |
| 4А | ИИ-аттестация (Anthropic) | ⬜ |
| 4Б | Заказы: фильтры, избранное, предложения | ⬜ |
| 5 | Лендинг и объявления | ⬜ |
| 6 | Тарифные пакеты | ⬜ |
| 7 | Платёжная система | ⬜ |
| 8 | Дашборд администратора | ⬜ |
| 9 | Технический надзор | ⬜ |
| 10 | ИИ Менеджер ТЗ (Gemini) | ⬜ |

---

---

# ЭТАП 0 — Аудит и фиксация стека

```
Твоя задача: полностью изучить проект и зафиксировать всё найденное в файлах.
Никаких изменений кода. Только анализ и документирование.

━━━ АВТОМАТИЧЕСКОЕ ОПРЕДЕЛЕНИЕ СТЕКА ━━━

Выполни следующие команды и проанализируй вывод:

# Общая структура
ls -la
find . -maxdepth 4 \( -name "*.csproj" -o -name "*.sln" -o -name "package.json" \
  -o -name "requirements.txt" -o -name "go.mod" -o -name "pom.xml" \
  -o -name "Gemfile" -o -name "Cargo.toml" \) \
  | grep -v node_modules | grep -v ".git" | sort

# Бекенд язык
find . -name "*.csproj" | grep -v node_modules | head -5   # C#
find . -name "go.mod" | head -3                             # Go
find . -name "requirements.txt" | grep -v node_modules | head -3  # Python
find . -name "pom.xml" | grep -v node_modules | head -3    # Java

# Фронтенд фреймворк
find . -name "package.json" | grep -v node_modules \
  | xargs grep -l '"next"\|"nuxt"\|"@angular\|"svelte"' 2>/dev/null

# ORM и БД
find . \( -name "*.csproj" -o -name "*.cs" \) \
  | xargs grep -l "EntityFramework\|Dapper\|Npgsql" 2>/dev/null | head -5
find . -name "schema.prisma" | grep -v node_modules
find . -name "alembic.ini" -o -name "models.py" | grep -v node_modules | head -3

# Конфигурация
find . -name "appsettings*.json" | grep -v node_modules
find . -name ".env*" | grep -v node_modules
find . -name "env.ts" -o -name "config.ts" | grep -v node_modules

# Тест-фреймворк
find . -name "*.Tests.csproj" -o -name "*Test*.csproj" | grep -v node_modules
cat package.json 2>/dev/null | grep -E '"jest"|"vitest"|"mocha"|"playwright"'
find . -name "pytest.ini" -o -name "conftest.py" | grep -v node_modules

# Авторизация
grep -r "JWT\|Bearer\|Identity\|authorize\|Authorize\|auth" . \
  --include="*.cs" --include="*.ts" --include="*.py" -l 2>/dev/null \
  | grep -v node_modules | head -10

# Роли пользователей
grep -r "\"admin\"\|\"user\"\|\"programmer\"\|\"client\"\|Role\." . \
  --include="*.cs" --include="*.ts" --include="*.py" 2>/dev/null \
  | grep -v node_modules | grep -v ".git" | head -15

# API маршруты — C#
find . -name "*Controller*.cs" | grep -v node_modules | head -20
# API маршруты — Node
find . -path "*/api/*" \( -name "*.ts" -o -name "*.js" \) \
  | grep -v node_modules | head -20

# Структура БД
find . -name "*Context*.cs" -o -name "*DbContext*.cs" | grep -v node_modules | head -5
cat prisma/schema.prisma 2>/dev/null | head -60

━━━ СОЗДАЙ ФАЙЛЫ ━━━

После анализа создай два файла:

--- ФАЙЛ 1: STACK_LOCK.md ---

# STACK_LOCK.md
# Зафиксированный стек проекта. НЕ ИЗМЕНЯТЬ без согласования.
# Claude Code обязан читать этот файл перед каждым этапом.

## Бекенд
- Язык и версия: [заполни из анализа]
- Фреймворк: [заполни]
- Папка: [заполни]
- Точка входа: [Program.cs / index.ts / main.py / ...]
- Запуск: [dotnet run / npm run dev / uvicorn / ...]

## Фронтенд
- Фреймворк и версия: [заполни]
- Язык: [TypeScript / JavaScript]
- Папка: [заполни]
- Запуск: [npm run dev / ...]

## База данных
- Тип: [PostgreSQL / MySQL / MSSQL / SQLite / MongoDB]
- ORM: [Entity Framework Core / Dapper / Prisma / Drizzle / SQLAlchemy]
- Как создать миграцию: [точная команда]
- Как применить миграцию: [точная команда]

## Конфигурация и секреты
- Механизм: [appsettings.json / dotenv / ...]
- Файл для разработки: [appsettings.Development.json / .env.local / ...]
- Как добавить новый ключ: [куда добавить и как прочитать в коде — конкретный пример]

## Тесты
- Бекенд тест-фреймворк: [xUnit / NUnit / Jest / pytest / ...]
- Фронтенд тест-фреймворк: [Playwright / Vitest / ...]
- Команда запуска всех тестов: [точная команда]
- Команда запуска одного теста: [точная команда с паттерном]
- Паттерн именования тест-файлов: [*.Tests.cs / *.test.ts / test_*.py]

## Авторизация
- Механизм: [ASP.NET Identity / JWT / NextAuth / Passport / ...]
- Как защитить новый эндпоинт: [атрибут / middleware / decorator — пример]
- Как получить текущего пользователя: [User.Identity / req.user / request.user — пример]
- Система ролей: [список существующих ролей]
- Как проверить роль: [точный пример из кода]

## API
- Базовый префикс: [/api/v1 / /api / ...]
- Формат успешного ответа: [{ data: ... } / прямой объект / ...]
- Формат ошибки: [{ error: ... } / { message: ... } / ...]
- Пример существующего контроллера/роута: [путь к файлу]

## Все существующие маршруты API
[список всех найденных маршрутов — метод + путь]

## Структура проекта
[дерево папок верхнего уровня]

## Важные замечания
[нестандартные решения, подводные камни, что важно знать]

--- ФАЙЛ 2: AUDIT_REPORT.md ---

Создай детальный отчёт:
- Полный список API эндпоинтов с описанием
- Существующие тесты: есть/нет, сколько, покрытие
- Найденные проблемы производительности (без исправления)
- Найденные баги (без исправления)  
- Устаревшие или лишние зависимости

━━━ ПРОВЕРКА ━━━

После создания файлов выполни:
cat STACK_LOCK.md
cat AUDIT_REPORT.md

Убедись что все разделы заполнены реальными данными, не заглушками.
Если какой-то раздел не удалось определить — напиши "НЕ ОПРЕДЕЛЕНО" и причину.
```

---

---

# ЭТАП 1 — Производительность

```
cat STACK_LOCK.md

Твоя задача: найти и устранить проблемы производительности.
Весь код пишется на языке/фреймворке из STACK_LOCK.md. Ничего не меняем — только добавляем.

━━━ АВТОМАТИЧЕСКИЙ АНАЛИЗ ━━━

Выполни анализ в зависимости от стека из STACK_LOCK.md:

[Если бекенд C# ASP.NET Core]
# Найти N+1 запросы — EF запросы в циклах
grep -rn "\.Find\|\.FirstOrDefault\|\.Where" . --include="*.cs" \
  | grep -v node_modules | grep -v Test | head -30
# Найти синхронные вызовы БД (без Async)
grep -rn "\.ToList()\b\|\.First()\b\|\.Single()\b" . --include="*.cs" \
  | grep -v node_modules | grep -v Test | head -20
# Найти контроллеры без кэширования
grep -rn "\[HttpGet\]" . --include="*.cs" \
  | grep -v node_modules | grep -v "ResponseCache\|Cache" | head -20

[Если бекенд Node.js]
# Найти дублирующиеся запросы
grep -rn "await.*find\|await.*query\|await.*select" . \
  --include="*.ts" --include="*.js" | grep -v node_modules | head -20
# Тяжёлые синхронные операции
grep -rn "readFileSync\|execSync" . --include="*.ts" \
  | grep -v node_modules | head -10

[Если фронтенд Next.js / React]
# Компоненты без мемоизации
grep -rn "export default function\|export const" . \
  --include="*.tsx" | grep -v node_modules | grep -v memo | head -20
# Изображения без lazy loading
grep -rn "<img " . --include="*.tsx" --include="*.jsx" \
  | grep -v node_modules | grep -v "loading=" | head -10

━━━ УСТАНОВКА ИНСТРУМЕНТОВ АНАЛИЗА ━━━

[Если фронтенд Next.js]
npm install --save-dev @next/bundle-analyzer
# Добавь в next.config.js (или next.config.ts) анализатор бандла — аддитивно

[Если фронтенд Vite]
npm install --save-dev rollup-plugin-visualizer
# Добавь в vite.config.ts аддитивно

[Если бекенд C#]
# Добавь MiniProfiler для анализа SQL запросов
dotnet add package MiniProfiler.AspNetCore.Mvc
dotnet add package MiniProfiler.EntityFrameworkCore
# Зарегистрируй в Program.cs аддитивно (новые строки, не менять существующие)

━━━ ИСПРАВЛЕНИЯ (только аддитивно) ━━━

По каждой найденной проблеме:
1. Если N+1 в EF Core → добавь .Include() к существующему запросу
2. Если синхронный вызов → замени на async версию в существующем методе
3. Если изображение без lazy → добавь атрибут loading="lazy"
4. Если дублирующийся API запрос → добавь кэширование через механизм проекта

Не трогай то что уже оптимизировано.

━━━ ДОБАВЬ СКРИПТ АУДИТА ━━━

[Если Node.js проект]
# Добавь в package.json (только новую строку, не менять существующие):
# "perf:audit": "npx lighthouse-ci autorun"
# Создай lighthouserc.js с базовыми порогами

[Если C# проект]
# Создай BenchmarkDotNet тест для критичных методов
dotnet add package BenchmarkDotNet --project [тест-проект из STACK_LOCK.md]

━━━ ТЕСТЫ ━━━

Используй тест-фреймворк из STACK_LOCK.md → Тесты.

[C# xUnit]
Создай тест который проверяет что GET /api/stats не выполняет более 3 запросов к БД
(используй MiniProfiler или перехват DbContext)

[Node.js Jest/Vitest]
Создай тест:
- GET /api/stats возвращает ответ менее чем за 200ms
- Повторный запрос GET /api/stats возвращается из кэша (mock БД не вызывается)

━━━ ДОКУМЕНТАЦИЯ ━━━

Создай docs/performance/README.md:
- Что было найдено
- Что оптимизировано (с указанием файлов)
- Что НЕ трогали и почему
- Как запустить аудит

Обнови корневой README.md — добавь раздел Performance.
```

---

---

# ЭТАП 2 — Чистка зависимостей

```
cat STACK_LOCK.md

Задача: найти и удалить неиспользуемые зависимости.
После каждого удаления — полная сборка. Если сломалась — немедленно вернуть.

━━━ АНАЛИЗ И ОЧИСТКА ━━━

[Если бекенд C#]
# Список всех пакетов
dotnet list package

# Для каждого пакета проверь используется ли он:
find . -name "*.cs" | xargs grep -l "НазваниеПространстваИмён" 2>/dev/null
# Если не найден ни в одном файле → удалить:
# dotnet remove package НазваниеПакета

# После каждого удаления:
dotnet build
# Если ошибка → dotnet add package НазваниеПакета обратно

[Если бекенд/фронтенд Node.js]
npm install -g depcheck 2>/dev/null || npx depcheck --json > /tmp/depcheck.json
cat /tmp/depcheck.json

# Для каждого "unused dependency":
grep -r "НазваниеПакета" src --include="*.ts" --include="*.tsx" \
  --include="*.js" --include="*.jsx" 2>/dev/null
# Если не найден → npm uninstall НазваниеПакета
# После каждого: npm run build

[Если Python]
pip install pip-autoremove 2>/dev/null
pip-autoremove --list
# Проверь каждый вручную перед удалением

━━━ БЕЗОПАСНОСТЬ ━━━

Не удалять:
- Пакеты используемые только в тестах (но упомянутые в devDependencies)
- Пакеты которые подтягиваются транзитивно
- Пакеты с peer dependencies

━━━ РЕЗУЛЬТАТ ━━━

Финальная проверка:
[C#] dotnet build && dotnet test
[Node] npm run build && npm test
[Python] python -m pytest

Создай CLEANUP_REPORT.md:
- Что удалено (пакет → причина)
- Что оставлено несмотря на предупреждения (причина)
- Размер до/после

Обнови корневой README.md.
```

---

---

# ЭТАП 3 — БД: авторизация и счётчики

```
cat STACK_LOCK.md

Задача А: устранить баг с повторяющимися логинами.
Задача Б: подключить реальные счётчики на главной странице.
Работаем только с ORM и языком из STACK_LOCK.md.

━━━ ШАГ 0: ИЗУЧИ СХЕМУ БД ━━━

[Если EF Core]
find . -name "*DbContext*.cs" -o -name "*Context*.cs" | grep -v node_modules
# Прочитай DbContext и все Entity классы
find . -path "*/Migrations/*" -name "*.cs" | sort | tail -3
# Прочитай последние 3 миграции чтобы понять паттерн

[Если Prisma]
cat prisma/schema.prisma

[Если Drizzle]
find . -name "schema.ts" | grep -v node_modules | head -3
# Прочитай схему

━━━ ЧАСТЬ А: БАГ С ЛОГИНАМИ ━━━

Найди код регистрации:
[C#] grep -rn "Register\|CreateUser\|SignUp" . --include="*.cs" | grep -v node_modules | grep -v Test | head -10
[Node] grep -rn "register\|signup\|createUser" . --include="*.ts" | grep -v node_modules | head -10
[Python] grep -rn "register\|create_user\|signup" . --include="*.py" | grep -v node_modules | head -10

Прочитай найденный файл целиком. Определи причину бага.

Исправь через СУЩЕСТВУЮЩИЙ механизм миграций:

[EF Core]
# 1. Добавь атрибут уникальности к модели (в существующий класс)
# [Index(nameof(Email), IsUnique = true)]
# 2. Создай миграцию
dotnet ef migrations add AddUniqueEmailConstraint --project [проект из STACK_LOCK.md]
dotnet ef database update
# 3. Добавь проверку в сервис/контроллер до вставки в БД
# if (await _context.Users.AnyAsync(u => u.Email == request.Email))
#     return Conflict("Email уже используется");

[Prisma]
# 1. Добавь в schema.prisma к модели User:
# @@unique([email])
# 2. Применить
npx prisma migrate dev --name add_unique_email

[Другой ORM из STACK_LOCK.md]
# Используй аналогичный подход для найденного ORM

━━━ ЧАСТЬ Б: СЧЁТЧИКИ ━━━

Найди компонент счётчиков на главной:
[C#] grep -rn "Count\|members\|projects\|clans" . --include="*.cshtml" --include="*.cs" --include="*.tsx" | grep -v node_modules | head -15
[Node/Next] grep -rn "count\|members\|projects\|stats" . --include="*.tsx" --include="*.ts" | grep -v node_modules | head -15

Найди или создай API эндпоинт статистики:
[C#] Создай StatsController.cs по паттерну существующих контроллеров
[Node] Создай route по паттерну существующих роутов

Эндпоинт GET /api/stats должен возвращать реальные COUNT из БД:
{
  "users": COUNT из таблицы пользователей,
  "activeOrders": COUNT заказов со статусом "активный",
  "completedOrders": COUNT заказов со статусом "завершён",
  "clans": COUNT кланов,
  "companies": COUNT проектных компаний
}

Добавь кэширование на 60 секунд:
[C#] [ResponseCache(Duration = 60)] или IMemoryCache
[Node/Next] Используй механизм кэша уже применяемый в проекте

Подключи данные к компоненту главной страницы.
Не меняй вёрстку — только источник данных.

━━━ ТЕСТЫ ━━━

Создай тесты на фреймворке из STACK_LOCK.md → Тесты:

[C# xUnit]
public class AuthTests : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Register_DuplicateEmail_Returns409Conflict() { ... }

    [Fact]
    public async Task Register_TenUsersInParallel_AllHaveUniqueEmails() { ... }
}

public class StatsTests : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task GetStats_ReturnsAllCounters() { ... }

    [Fact]
    public async Task GetStats_ResponseIsCached_DbNotCalledTwice() { ... }
}

[Jest/Vitest]
describe('POST /api/auth/register', () => {
  it('дублирующийся email → 409', async () => { ... })
  it('10 параллельных регистраций → уникальные логины', async () => { ... })
})
describe('GET /api/stats', () => {
  it('возвращает числовые счётчики', async () => { ... })
})

━━━ ДОКУМЕНТАЦИЯ ━━━

Создай docs/auth/README.md — описание фикса.
Обнови корневой README.md.
```

---

---

# ЭТАП 4А — ИИ-аттестация (Anthropic)

```
cat STACK_LOCK.md

Задача: добавить модуль аттестации программистов через диалог с Claude.
Новый код пишется на языке из STACK_LOCK.md. Существующий дашборд только дополняем.

━━━ ШАГ 0: ИЗУЧИ СУЩЕСТВУЮЩИЙ ДАШБОРД ПРОГРАММИСТА ━━━

grep -rn "programmer\|developer\|dashboard" . \
  --include="*.cs" --include="*.ts" --include="*.tsx" --include="*.py" \
  | grep -v node_modules | grep -v Test | head -20
# Прочитай найденные файлы. Запомни паттерн структуры и стилей.

━━━ ДОБАВЬ ANTHROPIC API КЛЮЧ В КОНФИГУРАЦИЮ ━━━

[Если appsettings.json]
# Добавь в appsettings.json (только новые строки):
# "Anthropic": {
#   "ApiKey": "",
#   "Model": "claude-sonnet-4-20250514"
# }
# Добавь в appsettings.Development.json реальный ключ

[Если dotenv / .env]
# Добавь в .env.example:
# ANTHROPIC_API_KEY=
# ANTHROPIC_MODEL=claude-sonnet-4-20250514

[Если другой механизм из STACK_LOCK.md]
# Используй его же

━━━ БД: ДОБАВЬ ТАБЛИЦУ АТТЕСТАЦИЙ ━━━

Добавь к схеме БД через механизм миграций из STACK_LOCK.md:

Таблица attestations:
- id (PK)
- user_id (FK → таблица пользователей из схемы)
- specialization (enum: frontend, backend, fullstack, mobile)
- level (enum: junior, middle, senior)
- score (int, 0-100)
- feedback (text)
- completed_at (datetime)
- can_retake_at (datetime = completed_at + 30 дней)

Поле к таблице пользователей (существующей):
- attestation_level (nullable, enum: junior, middle, senior)

[EF Core]
dotnet ef migrations add AddAttestationTable
dotnet ef database update

[Prisma]
npx prisma migrate dev --name add_attestation_table

━━━ УСТАНОВИ SDK ANTHROPIC ━━━

[C#]
dotnet add package Anthropic.SDK

[Node.js]
npm install @anthropic-ai/sdk

[Python]
pip install anthropic

━━━ СОЗДАЙ API ━━━

Создай новые эндпоинты по паттерну из STACK_LOCK.md → API (паттерн контроллера/роута):

POST /api/attestation/start
  Тело: { specialization: "frontend|backend|fullstack|mobile" }
  Ответ: { sessionId: string, firstQuestion: string }
  Логика: создать сессию, отправить первый вопрос в Anthropic

POST /api/attestation/message
  Тело: { sessionId: string, message: string, history: [{role, content}] }
  Ответ: { reply: string, isComplete: boolean, result?: {level, score, feedback} }
  Логика: отправить историю + новое сообщение в Anthropic, распарсить [RESULT] если есть

POST /api/attestation/complete
  Тело: { userId: string, level: string, score: int, feedback: string }
  Логика: сохранить в attestations, обновить user.attestation_level

GET /api/attestation/status
  Ответ: { level: string|null, score: int|null, canRetake: bool, nextRetakeAt: datetime|null }

System prompt для Anthropic:
"""
Ты технический интервьюер на IT платформе. Проводишь аттестацию разработчика по {specialization}.
Правила:
- Задавай вопросы строго по одному
- После каждого ответа давай краткую оценку (1-2 предложения)
- Задай ровно 10 вопросов — от простых к сложным
- После 10-го ответа выдай итог в теге:
  [RESULT]{"level":"junior|middle|senior","score":0-100,"feedback":"развёрнутый отзыв"}[/RESULT]
Язык: русский. Тон: профессиональный, поддерживающий.
"""

━━━ СОЗДАЙ UI БЛОК АТТЕСТАЦИИ ━━━

Найди страницу дашборда программиста и добавь новый блок.
Используй ТОЛЬКО существующие UI компоненты и классы стилей проекта.

Блок содержит:
- Текущий уровень пользователя (если есть)
- Дату последней аттестации
- Кнопку "Пройти аттестацию" (disabled если < 30 дней прошло)
- Выбор специализации перед стартом

Чат аттестации — открывается в существующем Modal/Dialog компоненте:
- История сообщений (ИИ слева, пользователь справа)
- Таймер 30 минут
- Поле ввода + кнопка отправить
- При получении [RESULT] — показать результат, закрыть чат

Голосовой режим (нативный, без новых зависимостей):
- Кнопка микрофона → window.SpeechRecognition для ввода
- window.speechSynthesis для озвучки вопросов

━━━ ТЕСТЫ ━━━

Создай тесты на фреймворке из STACK_LOCK.md → Тесты.
Для Anthropic — используй mock/stub.

Покрытие:

Unit:
- ParseAttestationResult("[RESULT]{\"level\":\"senior\",\"score\":90}[/RESULT]")
  → возвращает объект с правильными полями
- ParseAttestationResult("обычный текст") → null / пустой результат
- CanRetake(completedAt: вчера) → false
- CanRetake(completedAt: 31 день назад) → true

Integration (с mock Anthropic):
- POST /api/attestation/start → 200, sessionId в ответе
- POST /api/attestation/message → 200, reply не пустой
- POST /api/attestation/complete → запись появляется в БД
- GET /api/attestation/status → возвращает текущий уровень

━━━ ДОКУМЕНТАЦИЯ ━━━

Создай docs/attestation/README.md:
- Описание модуля и flow работы
- Ключ конфигурации (Anthropic API Key)
- Все API эндпоинты
- Команда запуска тестов

Обнови корневой README.md.
```

---

---

# ЭТАП 4Б — Заказы: фильтры, избранное, предложения

```
cat STACK_LOCK.md

Задача: дополнить раздел заказов. Существующая карточка и вёрстка — не трогать.

━━━ ШАГ 0: ИЗУЧИ СУЩЕСТВУЮЩИЙ КОД ━━━

# Найди страницу/контроллер заказов
grep -rn "orders\|Orders\|заказ" . \
  --include="*.cs" --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | grep -v Test | head -20

# Прочитай:
# - существующий API эндпоинт заказов (метод, путь, параметры, формат ответа)
# - существующую схему таблицы orders
# - существующий компонент карточки заказа

━━━ БД: ДОБАВЬ НОВЫЕ ТАБЛИЦЫ ━━━

Через механизм миграций из STACK_LOCK.md добавь:

Таблица favorites:
- id (PK)
- user_id (FK)
- order_id (FK)
- created_at
- UNIQUE(user_id, order_id)

Таблица proposals:
- id (PK)
- order_id (FK)
- programmer_id (FK)
- proposed_amount (int, в копейках/тиынах)
- deadline_days (int)
- cover_letter (text, max 500 символов)
- status (enum: pending, accepted, rejected)
- created_at

[EF Core] dotnet ef migrations add AddFavoritesAndProposals && dotnet ef database update
[Prisma] npx prisma migrate dev --name add_favorites_and_proposals

━━━ СОЗДАЙ API ЭНДПОИНТЫ ━━━

По паттерну из STACK_LOCK.md → API:

POST   /api/orders/{id}/favorite    — добавить в избранное
DELETE /api/orders/{id}/favorite    — убрать из избранного
GET    /api/orders/favorites        — мои избранные заказы
POST   /api/orders/{id}/proposal    — подать предложение {amount, deadlineDays, coverLetter}
GET    /api/orders/{id}/proposal    — мой статус предложения на этот заказ

Дополни СУЩЕСТВУЮЩИЙ эндпоинт GET /api/orders:
Добавь query параметры (не ломая существующие):
- minAmount, maxAmount (фильтр по сумме в тенге)
- dateFrom, dateTo (фильтр по дате публикации)
- favorites=true (только избранные)

ВАЖНО — скрытие данных заказчика:
В каждом ответе API никогда не возвращай email, phone, имя заказчика
если заказ не в статусе "в работе" у текущего пользователя.
Реализуй как общий метод/extension/middleware.

━━━ ОБНОВИ UI ━━━

Найди существующую карточку заказа.
Добавь к ней (не меняя существующую вёрстку):
- Кнопку ⭐ избранное (в угол карточки)
- Кнопку "Подать предложение"
- Индикатор статуса предложения если подано

Добавь панель фильтров НАД существующим списком:
- Диапазон суммы (мин/макс)
- Диапазон дат
- Параметры отражаются в URL (query string)

Для исполненных заказов — кнопка "Детали":
Показывает модальное окно: ТЗ, итоговая сумма, дата, отзыв, репозиторий.

━━━ ТЕСТЫ ━━━

Unit:
- MaskClientData(order) → объект не содержит email, phone, fullName клиента
- MaskClientData(order) для in-progress заказа текущего пользователя → все данные есть

Integration:
- POST /api/orders/{id}/favorite → 200
- POST /api/orders/{id}/favorite повторно → 409
- DELETE /api/orders/{id}/favorite → 200
- POST /api/orders/{id}/proposal → 200, запись в proposals
- GET /api/orders → ответ не содержит email/phone клиента
- GET /api/orders?minAmount=50000&maxAmount=200000 → все результаты в диапазоне

━━━ ДОКУМЕНТАЦИЯ ━━━

Создай docs/orders/README.md.
Обнови корневой README.md.
```

---

---

# ЭТАП 5 — Лендинг и объявления

```
cat STACK_LOCK.md

Задача: выровнять визуальные элементы лендинга. Добавить карусель объявлений.
Дизайн, цвета, шрифты — не трогать. Только выравнивание и новая секция.

━━━ ШАГ 0: ИЗУЧИ ЛЕНДИНГ ━━━

# Найди компоненты главной страницы
find . -name "index*" -o -name "Home*" -o -name "Landing*" \
  | grep -v node_modules | grep -v ".git" | head -10
# Прочитай каждый найденный файл.
# Составь список секций и опиши что именно не выровнено.

━━━ ВЫРАВНИВАНИЕ ━━━

Проверь каждую секцию:
- Одинаковый padding/margin у карточек в ряду?
- Одинаковая высота карточек?
- Выравнивание текста консистентно?
- Работает на 375px, 768px, 1280px?

Исправляй ТОЛЬКО через CSS/Tailwind классы в существующих компонентах.
Не трогай: имена компонентов, пропсы, импорты, бизнес-логику.

━━━ ТАБЛИЦА ОБЪЯВЛЕНИЙ В БД ━━━

Проверь: есть ли таблица announcements в схеме?
[EF Core] grep -rn "Announcement" . --include="*.cs" | grep -v node_modules | head -5
[Prisma] grep "announcement" prisma/schema.prisma

Если нет — добавь через механизм миграций из STACK_LOCK.md:
Таблица announcements:
- id (PK)
- title (string)
- body (text)
- published_at (datetime)
- expires_at (datetime, nullable)
- is_active (bool, default true)
- sort_order (int, default 0)

Добавь 3 тестовых записи через seed/fixtures.

[EF Core] dotnet ef migrations add AddAnnouncementsTable && dotnet ef database update
[Prisma] npx prisma migrate dev --name add_announcements

━━━ API ━━━

По паттерну из STACK_LOCK.md:
GET /api/announcements
  → возвращает только is_active=true, expires_at > now или null
  → отсортированы по sort_order ASC
  → кэширование 5 минут

━━━ СЕКЦИЯ ОБЪЯВЛЕНИЙ НА ЛЕНДИНГЕ ━━━

Добавь секцию В КОНЕЦ лендинга перед footer.
Используй ТОЛЬКО существующие компоненты карточек и стили проекта.
Карусель: автопрокрутка 5 сек, стрелки влево/вправо.
Если объявлений нет → секция не рендерится (не пустой блок, именно не рендерится).

━━━ ТЕСТЫ ━━━

Integration:
- GET /api/announcements → только is_active=true
- GET /api/announcements → expires_at в прошлом не возвращается
- GET /api/announcements → отсортированы по sort_order

━━━ ДОКУМЕНТАЦИЯ ━━━

Создай docs/announcements/README.md.
Обнови корневой README.md.
```

---

---

# ЭТАП 6 — Тарифные пакеты

```
cat STACK_LOCK.md

Задача: реализовать логику тарифов и добавить расчёт на форме заказа.
Не менять существующую форму — только дополнять.

━━━ ШАГ 0: ИЗУЧИ ФОРМУ СОЗДАНИЯ ЗАКАЗА ━━━

grep -rn "CreateOrder\|createOrder\|NewOrder\|new-order" . \
  --include="*.cs" --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | head -10
# Прочитай форму и контроллер. Запомни поля.

━━━ БИЗНЕС-ПРАВИЛА ТАРИФОВ ━━━

Пакет 1: сумма заказа ≤ 100 000 тг → комиссия 600 тг фиксированная (добавляется к сумме)
Пакет 2: сумма 100 001–500 000 тг → 1% (добавляется к сумме)
Пакет 3: сумма > 500 000 тг → 10% ВКЛЮЧЕНА в сумму + технадзор

ВАЖНО: все суммы хранить в ТИЫНАХ (× 100). Отображать пользователю в тенге (÷ 100).

━━━ СОЗДАЙ УТИЛИТУ РАСЧЁТА ━━━

[C#] Создай PricingService.cs в папке Services (по паттерну проекта):

public class PricingService
{
    public PricingResult Calculate(long orderAmountTiyn)
    {
        // 1: ≤ 10_000_000 тиын (100 000 тг) → комиссия 60_000 тиын (600 тг)
        // 2: ≤ 50_000_000 тиын (500 000 тг) → 1%
        // 3: > 50_000_000 тиын → 10% включена
    }
}

public record PricingResult(
    int Package,
    long OrderAmountTiyn,
    long CommissionTiyn,
    long TotalFromClientTiyn,
    long PayoutToExecutorTiyn,
    bool IncludesTechSupervision,
    long TechSupervisorShareTiyn,
    long PlatformShareTiyn
);

[Node.js/TypeScript] Создай lib/pricing.ts с аналогичной функцией calculateCommission()

[Python] Создай services/pricing.py с функцией calculate_commission()

━━━ БД: ДОБАВЬ ПОЛЯ К ORDERS ━━━

Через механизм миграций добавь к существующей таблице orders:
- package_tier (int: 1, 2 или 3)
- commission_amount (long/bigint, тиыны)
- total_amount (long/bigint, тиыны)

[EF Core] dotnet ef migrations add AddPackageTierToOrders && dotnet ef database update
[Prisma] npx prisma migrate dev --name add_package_tier_to_orders

━━━ UI: АВТОРАСЧЁТ НА ФОРМЕ ━━━

После поля ввода суммы добавь блок (используй существующие стили):
"Пакет X | Комиссия: X ₸ | Итого с вас: X ₸"
Обновляется при изменении суммы без перезагрузки страницы.

━━━ СЕКЦИЯ ТАРИФОВ НА ЛЕНДИНГЕ ━━━

Добавь таблицу сравнения пакетов.
Используй существующие компоненты таблиц/карточек проекта.

━━━ ТЕСТЫ ━━━

Unit тесты для утилиты расчёта (все граничные значения):
- 50 000 тг → пакет 1, комиссия 600 тг, клиент платит 50 600 тг
- 100 000 тг → пакет 1 (граница включительно)
- 100 001 тг → пакет 2, 1%
- 500 000 тг → пакет 2 (включительно)
- 500 001 тг → пакет 3, 10% включена, клиент платит 500 001 тг
- 1 000 000 тг → пакет 3, исполнитель получает 900 000 тг
- 0 → исключение/ошибка
- отрицательное → исключение/ошибка

Integration:
- POST /api/orders → package_tier и commission_amount сохранены верно в БД

━━━ ДОКУМЕНТАЦИЯ ━━━

Создай docs/pricing/README.md.
Обнови корневой README.md.
```

---

---

# ЭТАП 7 — Платёжная система

```
cat STACK_LOCK.md

Задача: реализовать платёжную систему с escrow схемой.
Весь код — на языке/фреймворке из STACK_LOCK.md.

━━━ ШАГ 0: ПРОВЕРЬ СУЩЕСТВУЮЩИЙ КОД ━━━

grep -rn "payment\|Payment\|invoice\|pay\b" . \
  --include="*.cs" --include="*.ts" --include="*.py" \
  | grep -v node_modules | grep -v Test | head -15
# Если уже есть payment код — изучи и дополняй его

━━━ ДОБАВЬ КОНФИГУРАЦИЮ ━━━

По механизму из STACK_LOCK.md → Конфигурация, добавь ключи:
- PaymentGatewayKey (значение "mock" для разработки)
- PaymentGatewaySecret
- PaymentWebhookSecret
- PaymentGatewayBaseUrl

━━━ БД: ТАБЛИЦЫ ПЛАТЕЖЕЙ ━━━

Добавь через механизм миграций из STACK_LOCK.md:

payments: id, order_id(FK), payer_id(FK), amount_tiyn(long), commission_tiyn(long),
          status(enum: pending,paid,failed,refunded), gateway_payment_id(string), created_at

escrow: id, payment_id(FK), held_amount_tiyn(long), released_at(datetime nullable),
        released_to_user_id(FK nullable)

payouts: id, user_id(FK), amount_tiyn(long),
         status(enum: pending,processed), processed_at(datetime nullable)

payment_logs: id, payment_id(FK), event(string), payload(json/text), created_at

[EF Core] dotnet ef migrations add AddPaymentTables && dotnet ef database update
[Prisma] npx prisma migrate dev --name add_payment_tables

━━━ УСТАНОВИ SDK ЕСЛИ НУЖЕН ━━━

[C# — Kaspi/Halyk/CloudPayments KZ]
# Проверь есть ли уже HTTP клиент в проекте
grep -rn "HttpClient\|IHttpClientFactory" . --include="*.cs" | grep -v node_modules | head -5
# Используй существующий механизм HTTP клиента

[Node.js]
npm install axios  # только если нет уже fetch/axios в проекте

━━━ СОЗДАЙ АБСТРАКЦИЮ ШЛЮЗА ━━━

[C#] Создай интерфейс IPaymentGateway и реализацию MockPaymentGateway:

public interface IPaymentGateway
{
    Task<CreatePaymentResult> CreatePaymentAsync(CreatePaymentParams p);
    Task<string> CheckStatusAsync(string gatewayPaymentId); // pending/paid/failed/refunded
    Task<RefundResult> RefundAsync(string gatewayPaymentId, long? amountTiyn = null);
}

public class MockPaymentGateway : IPaymentGateway
{
    // Симулирует платёж. Через 2 секунды статус меняется на "paid".
    // Refund всегда успешен.
}

// Зарегистрируй в DI через конфигурацию:
// if (config["PaymentGatewayKey"] == "mock") → MockPaymentGateway
// else → реальный шлюз

[Node.js] Создай lib/payment/gateway.ts с interface PaymentGateway и MockPaymentGateway

━━━ СОЗДАЙ API ━━━

По паттерну из STACK_LOCK.md:

POST /api/payments/initiate
  Тело: { orderId }
  Логика: рассчитать сумму → создать платёж через шлюз → сохранить в payments → вернуть redirectUrl

POST /api/payments/webhook
  Логика: верифицировать HMAC-SHA256 подпись → обновить статус платежа → логировать

GET /api/payments/{id}/status
  Ответ: { status, amount, createdAt }

POST /api/payments/{id}/release
  Доступ: только заказчик этого заказа
  Логика: пометить escrow как released → создать записи в payouts с правильным распределением:
    Пакет 1 и 2: 100% исполнителю
    Пакет 3: 90% исполнителю, 3% технадзору, 7% платформе

━━━ ТЕСТЫ ━━━

Unit:
- VerifyWebhookHmac(payload, secret, correctSignature) → true
- VerifyWebhookHmac(payload, secret, wrongSignature) → false
- CalculatePayout(amount, tier=1) → {executor: 100%, supervisor: 0, platform: 0}
- CalculatePayout(amount, tier=3) → {executor: 90%, supervisor: 3%, platform: 7%}

Integration (с MockPaymentGateway):
- POST /api/payments/initiate → 200, redirectUrl в ответе, запись в payments
- POST /api/payments/webhook с неверным HMAC → 401
- POST /api/payments/webhook с верным HMAC → 200, payment.status обновлён
- POST /api/payments/{id}/release → записи в payouts созданы

━━━ ДОКУМЕНТАЦИЯ ━━━

Создай PAYMENT_ARCHITECTURE.md (схема escrow flow для каждого пакета).
Создай docs/payment/README.md.
Обнови корневой README.md.
```

---

---

# ЭТАП 8 — Дашборд администратора

```
cat STACK_LOCK.md

Задача: создать полноценный admin дашборд.
Используй язык, фреймворк, паттерны из STACK_LOCK.md.

━━━ ШАГ 0: ИЗУЧИ СУЩЕСТВУЮЩУЮ АРХИТЕКТУРУ ━━━

# Есть ли уже /admin роуты?
grep -rn "admin\|Admin" . --include="*.cs" --include="*.ts" \
  | grep -v node_modules | grep "route\|Route\|controller\|Controller\|page\|Page" | head -15

# Как защищены приватные роуты в проекте?
grep -rn "Authorize\|authorize\|guard\|middleware\|protect" . \
  --include="*.cs" --include="*.ts" | grep -v node_modules | head -10

# Прочитай существующий auth middleware/атрибут чтобы применить такой же подход

━━━ ЗАЩИТА ADMIN РОУТОВ ━━━

По паттерну существующей авторизации из STACK_LOCK.md → Авторизация:

[C#] Создай или используй [Authorize(Roles = "admin")] на новых контроллерах
[Next.js] Создай middleware по паттерну существующего
[NestJS] Используй существующий Guard

━━━ БД: ДОБАВЬ ТАБЛИЦУ ФИЧ ━━━

Добавь через механизм миграций:

user_features: id, user_id(FK), feature_name(string), enabled(bool, default false), created_at
UNIQUE INDEX на (user_id, feature_name)

[EF Core] dotnet ef migrations add AddUserFeatures && dotnet ef database update
[Prisma] npx prisma migrate dev --name add_user_features

━━━ СОЗДАЙ SEED ПЕРВОГО АДМИНА ━━━

Создай скрипт/команду для создания первого администратора:

[C#] Создай HostedService или Console app:
dotnet run --project Tools/SeedAdmin -- --email admin@example.com --password [из конфига]

[Node.js] Создай scripts/seed-admin.ts:
npx ts-node scripts/seed-admin.ts

Добавь параметры в конфигурацию проекта по механизму из STACK_LOCK.md.

━━━ СОЗДАЙ API ЭНДПОИНТЫ (только для роли admin) ━━━

По паттерну из STACK_LOCK.md:

GET  /api/admin/stats                   — виджеты: пользователи, заказы, платежи за месяц
CRUD /api/admin/announcements           — управление объявлениями (из этапа 5)
GET  /api/admin/users                   — список с поиском и фильтрами
PUT  /api/admin/users/{id}/role         — изменить роль
PUT  /api/admin/users/{id}/block        — заблокировать/разблокировать
GET  /api/admin/orders                  — все заказы с откликами
PUT  /api/admin/orders/{id}/status      — принудительно изменить статус
GET  /api/admin/chats                   — список чатов
GET  /api/admin/chats/{id}              — история чата (только чтение)
PUT  /api/admin/chats/{id}/block        — заблокировать чат
GET  /api/admin/features                — фичи пользователей
PUT  /api/admin/features/{userId}       — включить/выключить фичу
GET  /api/admin/supervision             — заказы пакета 3 с технадзором

━━━ СОЗДАЙ UI СТРАНИЦЫ ━━━

По паттерну существующих страниц в проекте.
Sidebar навигация по разделам (используй существующие Layout компоненты если есть).

/admin — обзор: виджеты с реальными числами из БД
/admin/announcements — CRUD + drag&drop sort_order (нативный HTML5 DnD)
/admin/users — таблица с поиском, изменение роли, блокировка
/admin/orders — таблица с фильтрами, просмотр откликов с суммами
/admin/chats — список чатов, просмотр только чтение
  Автовыделение сообщений с паттернами обхода системы:
  (email regex, телефон regex, @username паттерн)
  Кнопка "Заблокировать чат"
/admin/features — таблица пользователей с toggle колонками:
  ai_manager (вкл/выкл ИИ Менеджер ТЗ)
/admin/supervision — заказы пакета 3, назначение технадзорщика

━━━ ТЕСТЫ ━━━

Integration:
- GET /admin без авторизации → 401 или редирект
- GET /admin с ролью user → 403
- GET /admin с ролью admin → 200
- POST /api/admin/announcements → создаёт запись в БД
- DELETE /api/admin/announcements/{id} → удаляет
- PUT /api/admin/users/{id}/role → обновляет роль в БД
- PUT /api/admin/features/{userId} → обновляет user_features

━━━ ДОКУМЕНТАЦИЯ ━━━

Создай docs/admin/README.md.
Обнови корневой README.md.
```

---

---

# ЭТАП 9 — Технический надзор

```
cat STACK_LOCK.md

Задача: роль технадзорщика, скрытие пакета 3, интерфейс проверки заказов.

━━━ ШАГ 0: ИЗУЧИ СУЩЕСТВУЮЩЕЕ ━━━

# Система ролей
grep -rn "role\|Role\|tech_supervisor\|supervisor" . \
  --include="*.cs" --include="*.ts" | grep -v node_modules | head -15

# Таблица attestations (из этапа 4А)
grep -rn "attestation\|Attestation" . \
  --include="*.cs" --include="*.ts" | grep -v node_modules | head -10

━━━ БД: ДОБАВЬ ПОЛЯ И ТАБЛИЦЫ ━━━

Через механизм миграций из STACK_LOCK.md:

К таблице orders добавь (если нет):
- tech_supervisor_id (FK nullable → users)
- supervision_status (enum: not_required, assigned, in_progress, approved, revision)
- supervision_report (text nullable)
- repository_url (string nullable)

Новая таблица supervision_applications:
- id, user_id(FK), status(enum: pending, approved, rejected), created_at

[EF Core] dotnet ef migrations add AddTechSupervision && dotnet ef database update
[Prisma] npx prisma migrate dev --name add_tech_supervision

━━━ ЛОГИКА ВИДИМОСТИ ЗАКАЗОВ ПАКЕТА 3 ━━━

Дополни существующий GET /api/orders:

Добавь фильтр на уровне SQL/ORM запроса (не UI):
Если order.package_tier == 3:
  Показывать ТОЛЬКО если у текущего пользователя:
  attestation_level == 'senior' AND specialization == 'fullstack'

[C# EF Core]
query = query.Where(o =>
    o.PackageTier != 3 ||
    (currentUser.AttestationLevel == "senior" && currentUser.Specialization == "fullstack")
);

[Prisma/Node]
where: {
  OR: [
    { packageTier: { not: 3 } },
    { AND: [{ packageTier: 3 }, { /* проверка пользователя */ }] }
  ]
}

━━━ РОЛЬ И ЗАЯВКИ ━━━

Добавь роль tech_supervisor в существующую систему ролей проекта.

API:
POST /api/supervision/apply
  Условие: только senior fullstack разработчик
  Логика: создать запись в supervision_applications

В /admin/supervision (из этапа 8) добавь:
  Список заявок с кнопками "Одобрить" / "Отклонить"
  PUT /api/admin/supervision/{id}/approve → присвоить роль tech_supervisor

━━━ ДАШБОРД ТЕХНАДЗОРЩИКА ━━━

Новая страница по паттерну существующих dashboard страниц.

Список назначенных заказов пакета 3:
- Название заказа, ссылка на репозиторий
- Чеклист проверки:
  ☐ ТЗ выполнено
  ☐ Код проверен
  ☐ Тесты пройдены
  ☐ Документация присутствует
- Textarea для отчёта
- Кнопки: "Подтвердить выполнение" / "На доработку"

"Подтвердить" → POST /api/payments/{orderId}/release
  (из этапа 7 — запускает выплату с распределением 90/3/7%)

━━━ ТЕСТЫ ━━━

Unit:
- CanViewOrder(juniorUser, tier3Order) → false
- CanViewOrder(seniorFullstackUser, tier3Order) → true
- CanViewOrder(anyUser, tier1Order) → true
- CalculateSupervisorPayout(1_000_000_00) → 30_000_00 (3%)

Integration:
- GET /api/orders от junior → нет заказов пакета 3 в ответе
- GET /api/orders от senior fullstack → есть заказы пакета 3
- POST /api/supervision/apply от junior → 403
- POST /api/supervision/apply от senior fullstack → 200
- PUT /api/admin/supervision/{id}/approve → роль tech_supervisor присвоена

━━━ ДОКУМЕНТАЦИЯ ━━━

Создай docs/supervision/README.md.
Обнови корневой README.md.
```

---

---

# ЭТАП 10 — ИИ Менеджер ТЗ (Gemini Live Chat)

```
cat STACK_LOCK.md

Задача: floating draggable виджет с Gemini для создания ТЗ.
Активируется администратором через /admin/features → ai_manager.
Подключается к существующему Layout минимально — одна строка.

━━━ ШАГ 0: ИЗУЧИ СУЩЕСТВУЮЩЕЕ ━━━

# Корневой Layout
find . -name "_app*" -o -name "layout*" -o -name "App.*" \
  | grep -v node_modules | head -10

# Существующие модальные/floating компоненты
grep -rn "modal\|Modal\|dialog\|Dialog\|floating\|drawer" . \
  --include="*.tsx" --include="*.ts" --include="*.cs" \
  | grep -v node_modules | head -15

# Таблица user_features (из этапа 8)
grep -rn "user_features\|UserFeature\|userFeature" . \
  --include="*.cs" --include="*.ts" | grep -v node_modules | head -10

━━━ ДОБАВЬ GEMINI КЛЮЧ В КОНФИГУРАЦИЮ ━━━

По механизму из STACK_LOCK.md → Конфигурация:

[appsettings.json] Добавь:
"Gemini": {
  "ApiKey": "",
  "Model": "gemini-1.5-pro"
}

[dotenv] Добавь в .env.example:
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-pro

━━━ УСТАНОВИ GEMINI SDK ━━━

[C#]
dotnet add package Google.Cloud.AIPlatform.V1
# или HttpClient к https://generativelanguage.googleapis.com/v1beta/

[Node.js / Next.js]
npm install @google/generative-ai

[Python]
pip install google-generativeai

━━━ БД: СЕССИИ ДИАЛОГА (ОПЦИОНАЛЬНО) ━━━

Добавь через механизм миграций:

ai_manager_sessions: id, user_id(FK), title(text), messages(jsonb/text),
                     tz_result(text nullable), created_at

[EF Core] dotnet ef migrations add AddAiManagerSessions && dotnet ef database update
[Prisma] npx prisma migrate dev --name add_ai_manager_sessions

━━━ СОЗДАЙ API ━━━

По паттерну из STACK_LOCK.md:

GET  /api/ai-manager/status
  Проверяет user_features: ai_manager = true для текущего пользователя
  Ответ: { enabled: bool }

POST /api/ai-manager/chat
  Заголовок: Authorization (существующий механизм)
  Тело: { message: string, history: [{role: "user"|"model", parts: string}] }
  Проверка: user_features.ai_manager == true, иначе 403
  Логика: передать историю + новое сообщение в Gemini с system prompt ниже
  Ответ: { reply: string, type: "text"|"concept"|"tz" }

POST /api/ai-manager/sessions (опционально)
  Сохранить сессию в ai_manager_sessions

GET  /api/ai-manager/sessions (опционально)
  Вернуть историю сессий пользователя

System prompt для Gemini:
"""
Ты ИИ-менеджер по разработке ПО. Помогаешь пользователю составить техническое задание.

Алгоритм работы:
1. Выслушай описание задачи
2. Задавай уточняющие вопросы — строго по одному за раз (3-7 вопросов)
3. В процессе предлагай технические концепты — оборачивай в тег:
   [CONCEPT]текст концепта[/CONCEPT]
4. Когда информации достаточно — сгенерируй ТЗ:
   [TZ_START]
   ## Цель проекта
   ## Функциональные требования (нумерованный список)
   ## Нефункциональные требования
   ## Рекомендуемый стек технологий
   ## Этапы реализации с оценкой времени
   ## Критерии приёмки
   [TZ_END]

Язык ответов: русский.
Стиль: профессиональный, конкретный, без воды.
"""

━━━ СОЗДАЙ ВИДЖЕТ ━━━

Создай компонент AiManagerWidget по паттерну фронтенд фреймворка из STACK_LOCK.md.
Используй ТОЛЬКО существующие CSS классы и стили проекта.

Структура виджета:

1. Кнопка запуска (фиксированная, правый нижний угол):
   position: fixed, bottom: 24px, right: 24px
   Иконка 💬 + текст "ИИ Менеджер"

2. Draggable окно (появляется по клику):

┌─────────────────────────────────────────────┐
│ 💬 ИИ Менеджер ТЗ          [_] [✕]          │  ← drag handle
├─────────────────────────────────────────────┤
│                                              │
│  🤖 Опишите вашу задачу...                   │
│                                              │
│  👤 Нужен маркетплейс для...                 │
│                                              │
│  💡 [CONCEPT карточка — выделенный блок]      │
│                                              │
│  📄 [TZ блок + кнопки Скопировать/Сохранить] │
│                                              │
├─────────────────────────────────────────────┤
│ [__________textarea__________] [Отправить]   │
└─────────────────────────────────────────────┘

Draggable — нативный JS без библиотек:
  onMouseDown на шапке → начать drag
  onMouseMove → обновить position (left, top)
  onMouseUp → сохранить позицию:
    localStorage.setItem('ai_manager_pos', JSON.stringify({x, y}))

При открытии → восстановить позицию из localStorage.
При закрытии → показать confirm("Завершить сессию? Несохранённый диалог будет утерян.")

Парсинг ответа:
  [CONCEPT]текст[/CONCEPT] → карточка с иконкой 💡 и особым фоном
  [TZ_START]текст[/TZ_END] → блок с кнопками "Скопировать" и "Сохранить в сессию"
  Обычный текст → обычное сообщение ИИ

━━━ ПОДКЛЮЧИ К LAYOUT ━━━

Найди корневой Layout компонента фронтенда.
Добавь ОДНУ строку (не больше):

[React/Next.js]
{user?.features?.aiManager && <AiManagerWidget userId={user.id} />}

[Vue]
<AiManagerWidget v-if="user?.features?.aiManager" :userId="user.id" />

[Angular]
<app-ai-manager-widget *ngIf="user?.features?.aiManager" [userId]="user.id">

Не трогай больше ничего в layout файле.

━━━ ТЕСТЫ ━━━

Unit (с mock Gemini):
- parseGeminiResponse("обычный текст") → [{type:"text", content:"обычный текст"}]
- parseGeminiResponse("[CONCEPT]концепт[/CONCEPT]") → [{type:"concept", content:"концепт"}]
- parseGeminiResponse("[TZ_START]ТЗ...[TZ_END]") → [{type:"tz", content:"ТЗ..."}]
- parseGeminiResponse со смешанным контентом → массив из 3+ блоков разных типов

Integration (с mock Gemini API):
- GET /api/ai-manager/status без фичи → {enabled: false}
- GET /api/ai-manager/status с фичей → {enabled: true}
- POST /api/ai-manager/chat без фичи → 403
- POST /api/ai-manager/chat с фичей и mock Gemini → 200, reply не пустой
- POST /api/ai-manager/chat с пустым message → 400

━━━ ДОКУМЕНТАЦИЯ ━━━

Создай docs/ai-manager/README.md:
- Что такое ИИ Менеджер ТЗ
- Как активировать: Admin → /admin/features → включить ai_manager для пользователя
- Ключ конфигурации: GEMINI_API_KEY / Gemini:ApiKey
- Flow диалога (шаги 1-4)
- Теги ответов: [CONCEPT], [TZ_START/END]
- Виджет: draggable, localStorage ключ
- API маршруты с примерами
- Тесты: [команда из STACK_LOCK.md] -- ai-manager

Обнови корневой README.md — добавь раздел ИИ Менеджер ТЗ.
```

---

---

## 📌 НАПОМИНАНИЕ

Каждый промпт полностью самодостаточен.
Claude Code сам:
- читает STACK_LOCK.md
- определяет нужные команды для своего стека
- устанавливает зависимости
- создаёт миграции и применяет их
- пишет тесты на правильном фреймворке
- обновляет документацию

Человек запускает промпт → принимает результат.
