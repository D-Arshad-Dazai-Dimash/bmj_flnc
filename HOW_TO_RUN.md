# Как запустить проект Barnamaj

## Требования

| Инструмент | Версия | Проверка |
|---|---|---|
| Docker Desktop | 4.x+ | `docker --version` |
| .NET SDK | 8.0+ | `dotnet --version` |
| Node.js | 20+ | `node --version` |
| npm | 10+ | `npm --version` |

---

## 1. Запуск инфраструктуры (Docker)

```bash
# Из корня проекта
docker compose up -d
```

Запускает:
- **PostgreSQL** — `localhost:5433` (хост) → `5432` (контейнер)
- **pgAdmin** — `http://localhost:5050` (admin@barnamaj.dev / admin)
- **Redis** — `localhost:6379`
- **MinIO** — `http://localhost:9001` (barnamaj_minio / barnamaj_minio_pass)

Проверить что всё запущено:
```bash
docker compose ps
```

---

## 2. Запуск Backend (.NET 8)

```bash
cd backend/Barnamaj.API
dotnet run
```

API доступен по адресу: `http://localhost:5000`  
Swagger UI: `http://localhost:5000/swagger`  
Health check: `http://localhost:5000/health`

> **Первый запуск:** EF Core автоматически создаёт/мигрирует БД при старте (если `MigrateOnStartup: true` в appsettings).

---

## 3. Запуск Frontend (Next.js 15)

```bash
cd frontend/barnamaj-web
npm install        # только при первом запуске или после изменений package.json
npm run dev
```

Фронтенд доступен по адресу: `http://localhost:3000`

### Переменные окружения

Создайте `frontend/barnamaj-web/.env.local` (если не существует):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 4. Запуск всего вместе (порядок важен)

```
1. docker compose up -d         # инфраструктура
2. dotnet run (backend/Barnamaj.API) # backend
3. npm run dev (frontend/barnamaj-web)    # frontend
```

---

## 5. Запуск тестов

### E2E тесты (Playwright)

```bash
cd frontend/barnamaj-web

# Установить браузеры (только один раз)
npx playwright install chromium

# Запустить все тесты (нужны запущенные backend + frontend)
npx playwright test

# Запустить только smoke тест
npx playwright test e2e/smoke.spec.ts

# Запустить с UI
npx playwright test --ui
```

> **Важно:** Smoke тест требует запущенного backend на `http://localhost:5000` и frontend на `http://localhost:3000`.

---

## 6. Сборка проекта

### Backend

```bash
cd backend/Barnamaj.API
dotnet build
```

### Frontend

```bash
cd frontend/barnamaj-web
npm run build
npm run typecheck   # проверка TypeScript
```

---

## 7. Остановка

```bash
docker compose down          # остановить контейнеры (данные сохраняются)
docker compose down -v       # остановить + удалить volumes (ДАННЫЕ УДАЛЯТСЯ)
```

---

## 8. Часто встречающиеся проблемы

### `Connection refused` при запуске backend
- Убедитесь что PostgreSQL контейнер запущен: `docker compose ps`
- Порт 5433 должен быть свободен: `netstat -ano | findstr 5433`

### Cookie не устанавливается (HTTP)
- В `appsettings.Development.json` уже стоит `"Cookie": { "Secure": false }`
- Это нормально для локальной разработки на HTTP

### `NEXT_PUBLIC_API_URL` не задан
- Frontend по умолчанию использует `http://localhost:5000`
- Можно переопределить через `frontend/barnamaj-web/.env.local`

### Frontend не видит backend (CORS)
- CORS настроен в `backend/Barnamaj.API/Extensions/` для `http://localhost:3000`
- При изменении порта frontend — обновить CORS origins в appsettings
