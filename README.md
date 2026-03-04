# Barnamaj — High-Load Freelance Platform

Backend на **ASP.NET Core 8** + **PostgreSQL** + **Docker**.

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
cd src/Barnamaj.API

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

## Следующие шаги

- [ ] Добавить модели `User`, `FreelancerProfile`, `Job`, `Proposal`
- [ ] Настроить JWT авторизацию (`ServiceExtensions.cs` готов)
- [ ] Добавить Redis для кэша (заменить `AddMemoryCache`)
- [ ] Настроить CI/CD (GitHub Actions / GitLab CI)
- [ ] Добавить Nginx как reverse proxy перед API
- [ ] Настроить мониторинг (Prometheus + Grafana)
