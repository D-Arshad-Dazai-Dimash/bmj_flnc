# Barnamaj — High-Load Freelance Platform

Backend на **ASP.NET Core 8** + **PostgreSQL** + **Docker**.

## Chat / Applications / Contracts (май 2026)

Полный backend-цикл сделки: отклик → одобрение/отклонение → контракт с этапами → платёж.

### Чат (cross-browser sync)
- Сообщения хранятся в БД (`chat_threads`, `chat_messages`). Поллинг 3-5 секунд для синхронизации между браузерами/устройствами.
- Пара профилей нормализуется (меньший GUID первым) → уникальный индекс на паре. Один тред на связку (опционально привязан к проекту).
- API: `GET/POST /api/chat/threads`, `GET/POST /api/chat/threads/{id}/messages`, `POST /api/chat/threads/{id}/read`, `GET /api/chat/unread-count`.

### Отклики на проекты
- При `POST /api/projects/{id}/apply` бэкенд автоматически создаёт чат-тред с заказчиком и отправляет system-сообщение с cover letter — заказчик мгновенно видит отклик.
- Владелец проекта видит откликнувшихся в карточке проекта: список через `GET /api/projects/{id}/applications`.
- Одобрение: `POST /api/projects/applications/{id}/accept` → проект переходит в `InProgress`, остальные `Pending`-заявки помечаются `Rejected`, всем участникам уходят system-сообщения.
- Отклонение: `POST /api/projects/applications/{id}/reject` + system-сообщение.

### Контракты
- Сущности: `contracts`, `contract_milestones`, `contract_events`.
- Создаёт клиент через `POST /api/contracts` (после `Accepted`-заявки). Сумма этапов == TotalAmount, минимум 1 этап.
- Машина состояний: `Active` → `InReview` (когда все этапы Submitted) → `Released` (когда все Approved); параллельно `Active ↔ Disputed`, `→ Cancelled`.
- Этапы:
    - executor: `submit` (последовательно, требует предыдущий Approved);
    - client: `approve` / `reject`.
- Каждое действие пишется в `contract_events` (история) и отправляется в общий чат-тред как system-сообщение.

### Миграция
`backend/Barnamaj.API/Data/Migrations/20260510195025_AddChatAndContracts.cs` — применяется автоматически при старте API (`dotnet ef database update` если запускать вручную).

## Security Hardening (май 2026)

- KYC moderation доступ переведён на иерархию ролей через `RequireRole(UserRole.Moderator)`
    вместо legacy-строки ролей.
- `appsettings.json` (production):
    - убран `Include Error Detail=true` из `ConnectionStrings:DefaultConnection`
    - `AllowedHosts` переведён на явный allowlist host'ов (формат `;`) для работы за Fly proxy без wildcard.
- Добавлены regression-тесты в `backend/Barnamaj.Tests`:
    - `Controllers/KycModerationAuthorizationTests.cs`
    - `Config/ProductionSecurityConfigTests.cs`
- Исправлен cross-domain auth (Vercel frontend -> Fly backend):
    - cookies вынесены в конфиг `Cookie:SameSite` и в production выставлены как `SameSite=None; Secure`;
    - `AllowedOrigins` расширен актуальными frontend-доменами (`vercel.app`, `barnamaj.kz`, `www.barnamaj.kz`).
- Разделён вход для обычных пользователей и админов:
    - `/api/auth/login` теперь только для non-admin пользователей;
    - `/api/auth/admin/login` — отдельный endpoint для `Moderator/SeniorAdmin/HeadAdmin`;
    - на фронтенде добавлена отдельная страница `/[lang]/admin-auth`.

### Продакшн заметка (Vercel + Fly)

- При раздельном домене frontend/backend auth cookies (`access_token`, `refresh_token`) принадлежат backend-домену.
- Из-за этого Next middleware на frontend-домене не должен использовать cookie-presence как источник истины для auth.
- Проверка сессии выполняется клиентским запросом `GET /api/auth/me` (с `credentials: include`).

## Auth & Routing Fixes (январь 2026)

- **Post-Logout Redirect**: `logout()` теперь перенаправляет на `/[lang]/auth?mode=login` вместо оставления на текущей странице. Исправлены `Sidebar.tsx` и `Navbar.tsx` handlers.
- **Admin Dashboard Access Guard**: Админы (`Moderator`, `SeniorAdmin`, `HeadAdmin`) теперь надёжно перенаправляются на `/admin` при попытке доступа к `/dashboard`. Улучшена логика в `dashboard/layout.tsx` — убрана race condition путём исключения `isAtLeast` из `useEffect` зависимостей (проверка `user.role` напрямую).
- **Cookie Deletion on Logout** (backend fix): `ClearAuthCookies()` теперь использует те же `HttpOnly`, `Secure`, `SameSite` свойства что и `SetAuthCookies()`. Исправлена критическая ошибка где cookies не удалялись, позволяя пользователям оставаться залогиненными после logout.

## Auth Hardening (май 2026)

- **Refresh Token Rotation + Reuse Detection**:
    - добавлена таблица `refresh_tokens` и серверное хранение refresh-сессий (хранится только SHA-256 hash токена);
    - реализована sliding-rotation: при каждом `POST /api/auth/refresh` выдаётся новый refresh в той же `family`;
    - повторное использование старого rotated токена помечается как `reuse_detected` и отзывает всю family (RFC 6819 style).
- **Server-side logout revocation**:
    - `POST /api/auth/logout` теперь не только чистит cookies, но и отзывает текущий refresh `jti` в хранилище.
- **Structured auth logging**:
    - добавлен `CorrelationIdMiddleware` (`X-Correlation-Id` в request/response);
    - auth-события (`login`, `register`, `refresh`, `logout`) логируются с полями `user_id`, `ip`, `user_agent`, `family_id`/`jti`.
- **Frontend centralized role guard**:
    - добавлены `frontend/src/lib/roleGuard.ts` и `frontend/src/hooks/useRoleGuard.ts`;
    - `dashboard` и `admin` layout переведены на единый декларативный guard.
- **Новые тесты**:
    - backend: `backend/Barnamaj.Tests/Services/RefreshTokenStoreTests.cs` (rotation/reuse/revocation);
    - frontend e2e: `frontend/e2e/auth-logout.spec.ts`, `frontend/e2e/role-guard.spec.ts`, `frontend/e2e/refresh-rotation.spec.ts`.

---

## Структура проекта

```
BJ/
├── docker-compose.yml          # PostgreSQL + pgAdmin + (api)
├── init-scripts/
│   └── 01_init.sql             # SQL, выполняется при первом запуске БД
├── .gitignore
├── README.md
└── src/
    └── Barnamaj.API/
        ├── Barnamaj.API.csproj
        ├── Dockerfile              # Multi-stage build
        ├── Program.cs              # Entry point
        ├── appsettings.json        # Production config (connection string)
        ├── appsettings.Development.json
        ├── Controllers/
        │   ├── BaseApiController.cs
        │   └── HealthController.cs
        ├── Data/
        │   └── AppDbContext.cs
        ├── Extensions/
        │   └── ServiceExtensions.cs  # JWT, AutoMapper, кэш
        └── Properties/
            └── launchSettings.json
```

---

## Предварительные требования

| Инструмент      | Минимальная версия |
|-----------------|--------------------|
| Docker Desktop  | 24+                |
| .NET SDK        | 8.0+               |
| VS Code         | любая              |

---

## Шаг 1 — Запустить PostgreSQL и pgAdmin

Откройте терминал в VS Code (`Ctrl + \``) в папке проекта (`BJ/`):

```bash
# Поднять контейнеры в фоне
docker compose up -d postgres pgadmin

# Проверить, что всё запустилось
docker compose ps

# Смотреть логи PostgreSQL в реальном времени
docker compose logs -f postgres
```

**pgAdmin** будет доступен на [http://localhost:5050](http://localhost:5050)

| Поле     | Значение              |
|----------|-----------------------|
| Email    | `admin@barnamaj.dev`  |
| Password | `pgadmin_pass_2025`   |

Чтобы подключить сервер в pgAdmin:
- **Host**: `postgres` (имя сервиса Docker)
- **Port**: `5432`
- **Username**: `barnamaj_user`
- **Password**: `barnamaj_pass_2025`

---

## Шаг 2 — Запустить .NET API локально (для разработки)

```bash
cd backend/Barnamaj.API

# Восстановить пакеты NuGet
dotnet restore

# Установить инструменты EF Core (один раз)
dotnet tool install --global dotnet-ef

# Создать первую миграцию
dotnet ef migrations add InitialCreate --output-dir Data/Migrations

# Применить миграцию к БД
dotnet ef database update

# Запустить API
dotnet run
```

API будет доступен на [http://localhost:5000](http://localhost:5000)  
Swagger UI → [http://localhost:5000](http://localhost:5000) (открывается на корне в Development)

---

## Шаг 3 — Собрать и запустить API в Docker

```bash
# Вернуться в корень проекта
cd ../..

# Раскомментировать секцию `api:` в docker-compose.yml, затем:
docker compose build api

# Запустить всё вместе
docker compose up -d

# Проверить health
curl http://localhost:8080/health/live
curl http://localhost:8080/health/ready
```

---

## Полезные команды

```bash
# Остановить все контейнеры
docker compose down

# Остановить и удалить тома (СБРОСИТ БАЗУ ДАННЫХ!)
docker compose down -v

# Перезапустить только API после изменений
docker compose up -d --build api

# Войти внутрь контейнера PostgreSQL
docker exec -it barnamaj-postgres psql -U barnamaj_user -d barnamaj_db

# Применить миграции внутри Docker
docker exec barnamaj-api dotnet ef database update

# Смотреть логи API
docker compose logs -f api
```

---

## Переменные окружения (Production)

В продакшне передавайте секреты через переменные окружения, **не через файлы**:

```bash
docker compose run -e "ConnectionStrings__DefaultConnection=..." api
```

Или используйте Docker Secrets / Kubernetes Secrets.

---

## Health Checks

| Endpoint              | Назначение                              |
|-----------------------|-----------------------------------------|
| `GET /health/live`    | Сервис запущен (для liveness probe)    |
| `GET /health/ready`   | БД доступна (для readiness probe)      |
| `GET /api/health/live`| Полный ответ с деталями                 |

---

## Performance

Оптимизация производительности выполнена — см. [docs/performance/README.md](docs/performance/README.md).

**Бекенд:**
- `[ResponseCache]` на всех публичных GET эндпоинтах (30s — 1ч)
- MiniProfiler для мониторинга SQL запросов (Development)
- ResponseCaching middleware
- Serilog: лимит размера файлов 50MB

**Фронтенд:**
- Image cache TTL: 1 год (31536000s)
- Bundle analyzer: `npm run analyze`

---

## Auth & Stats

- Email уникальность: индекс `ix_users_email` + проверка в сервисе
- `GET /api/stats` — публичные счётчики с кэшем 60s
- Подробнее: [docs/auth/README.md](docs/auth/README.md)

---

## Frontend Design System

- Текущий визуальный язык: premium dark SaaS в духе Vercel / Linear на базе brand-палитры Barnamaj
- Основные токены живут в `frontend/src/app/globals.css` и `frontend/tailwind.config.ts`
- Базовые принципы: полупрозрачные `rgba`-бордеры, card-surfaces вместо плоских solid panels, плотная типографика Inter Variable, спокойные градиенты из палитры логотипа
- Ключевые экраны, приведённые к этому стилю: лендинг, navbar, auth, sidebar, dashboard overview, orders, create-project, profile, projects, settings, tests, clans, contracts, admin shell
- Лендинг усилен в enterprise-сторону: split hero, control-layer panel, премиальные stats/pricing surfaces
- Локальный frontend должен использовать `frontend/.env.local` с `NEXT_PUBLIC_API_URL=http://localhost:5000`

---

## ИИ-аттестация

Модуль аттестации разработчиков через диалог с Claude (Anthropic).
Подробнее: [docs/attestation/README.md](docs/attestation/README.md).

- Специализации: frontend, backend, fullstack, mobile
- Уровни: junior, middle, senior
- 10 вопросов от простых к сложным
- Повторная аттестация через 30 дней
- Голосовой ввод/вывод (Web Speech API)

---

## Заказы: фильтры, избранное, предложения

Расширенная лента заказов с фильтрацией и предложениями.
Подробнее: [docs/orders/README.md](docs/orders/README.md).

- Фильтры: тип, бюджет (мин/макс), дата публикации
- Избранное с оптимистичным обновлением
- Детальные предложения (цена, срок, cover letter)
- Скрытие персональных данных заказчика

### HH-like лента заказов (май 2026)

- `frontend/src/app/[lang]/dashboard/orders/page.tsx` переработана в стиль job-board:
    - поиск по заголовку/описанию;
    - фильтры: бюджет от/до, дедлайн, тип заказчика;
    - сортировка: новые, бюджет (asc/desc), ближайший дедлайн;
    - серверная пагинация + "Показать ещё".
- Backend `GET /api/projects/feed` теперь принимает query-параметры `q`, `minBudget`, `maxBudget`, `deadlineFrom`, `deadlineTo`, `clientType`, `sort`, `page`, `pageSize`.
- Security-by-design:
    - в ленте и публичных профилях отдаются только разрешённые публичные поля;
    - query-параметры на сервере клампятся/валидируются (защита от тяжёлых запросов).

### Публичные профили (Instagram-like)

- Добавлен каталог профилей: `frontend/src/app/[lang]/profiles/page.tsx` (поиск + фильтры).
- Публичная страница `frontend/src/app/[lang]/profiles/[id]/page.tsx` усилена:
    - блоки активности (публикации, выполнено, в работе);
    - секции публикаций: активные и завершённые;
    - закреплённые публикации остаются сверху.

---

## Объявления

Карусель объявлений на лендинге с автопрокруткой.
Подробнее: [docs/announcements/README.md](docs/announcements/README.md).

- Автопрокрутка 5 сек, навигация стрелками
- RLS: только активные и не истёкшие
- 3 seed-записи в миграции

---

## Тарифные пакеты

3 пакета с автоматическим расчётом комиссии.
Подробнее: [docs/pricing/README.md](docs/pricing/README.md).

- Пакет 1: до 100К ₸ — 600 ₸ фиксированная
- Пакет 2: 100К–500К ₸ — 1%
- Пакет 3: от 500К ₸ — 10% включена + технадзор

---

## Платёжная система

Escrow с абстракцией шлюза и HMAC-верификацией.
Подробнее: [docs/payment/README.md](docs/payment/README.md).

- MockPaymentGateway для разработки
- HMAC-SHA256 webhook верификация
- Автоматическое распределение выплат (90/3/7% для пакета 3)

---

## Административная панель

Полная панель управления платформой.
Подробнее: [docs/admin/README.md](docs/admin/README.md).

- 7 разделов: обзор, объявления, пользователи, заказы, чаты, фичи, технадзор
- Drag & drop сортировка объявлений
- Автовыделение паттернов обхода в чатах
- Feature flags (ai_manager toggle)

---

## Технический надзор

Роль технадзорщика для заказов пакета 3.
Подробнее: [docs/supervision/README.md](docs/supervision/README.md).

- Заявка на роль: только senior fullstack
- Чеклист проверки + отчёт
- Распределение 90/3/7%

---

## ИИ Менеджер ТЗ (Gemini)

Виджет-помощник для составления ТЗ через диалог с Gemini AI.
Подробнее: [docs/ai-manager/README.md](docs/ai-manager/README.md).

- Плавающий виджет в дашборде (drag & drop)
- Уточняющие вопросы → технические концепты → генерация ТЗ
- Копирование и сохранение ТЗ как файл
- Feature flag: включается администратором через `/admin/features`

---

## CI/CD (GitHub Actions + Fly + Vercel)

- Backend автодеплоится на Fly при push в `main` (если изменены файлы в `backend/Barnamaj.API/**`).
- Workflow: `.github/workflows/deploy-backend-fly.yml`.
- Для работы workflow добавьте GitHub Secret: `FLY_API_TOKEN`.
- Frontend обновляется через Vercel Auto Deploy из ветки `main` (на стороне Vercel-проекта).
- Дополнительно настроен принудительный запуск Vercel Deploy Hook через GitHub Actions при изменениях во `frontend/**`.
- Workflow: `.github/workflows/deploy-frontend-vercel.yml`.
- Для работы frontend workflow добавьте GitHub Secret: `VERCEL_DEPLOY_HOOK_URL`.
- Добавлен корневой `package.json` с `vercel-build`, который выполняет сборку из `frontend/` даже если в Vercel временно неверно выставлен Root Directory.

---

## Следующие шаги

- [ ] Добавить Redis для распределённого кэша (заменить `AddMemoryCache`)
- [x] Настроить CI/CD (GitHub Actions / Fly для backend, Vercel Auto Deploy для frontend)
- [ ] Добавить Nginx как reverse proxy перед API
- [ ] Настроить мониторинг (Prometheus + Grafana)
