# Performance — Оптимизация производительности

## Что было найдено

### Бекенд (.NET API)
1. **Отсутствие ResponseCache** на всех публичных GET эндпоинтах — каждый запрос выполнял полный цикл обработки
2. **Нет инструментов мониторинга SQL** — невозможно отслеживать медленные запросы
3. **Serilog без лимита размера файла** — потенциальное заполнение диска логами

### Фронтенд (Next.js)
1. **minimumCacheTTL = 60 секунд** для изображений — слишком частое перекэширование
2. **Нет bundle analyzer** — невозможно отследить размер бандла

## Что оптимизировано

### Бекенд

| Файл | Изменение |
|------|-----------|
| `Controllers/AssessmentController.cs` | `[ResponseCache(Duration=3600)]` на GET /skills |
| `Controllers/AssessmentController.cs` | `[ResponseCache(Duration=300)]` на GET /badges/{id} |
| `Controllers/ProjectsController.cs` | `[ResponseCache(Duration=30)]` на GET /feed |
| `Controllers/ProfilesController.cs` | `[ResponseCache(Duration=300)]` на GET /profiles |
| `Barnamaj.API.csproj` | Добавлен MiniProfiler.AspNetCore.Mvc + EFCore |
| `Program.cs` | Зарегистрирован MiniProfiler (только Development) |
| `Program.cs` | Добавлен `AddResponseCaching()` + `UseResponseCaching()` |
| `Program.cs` | Serilog: `fileSizeLimitBytes: 50MB` |

### Фронтенд

| Файл | Изменение |
|------|-----------|
| `next.config.ts` | `minimumCacheTTL: 60` -> `31536000` (1 год) |
| `next.config.ts` | Добавлен `@next/bundle-analyzer` (conditional) |
| `package.json` | Скрипт `"analyze": "ANALYZE=true next build"` |

## Что НЕ трогали и почему

1. **N+1 запросы в Select()** — EF Core транслирует `p.Applications.Count()` внутри `.Select()` как SQL подзапрос (не отдельный запрос). Это НЕ N+1.
2. **EF.Functions.Random()** — корректно транслируется в PostgreSQL `RANDOM()`. Замена не требуется.
3. **Компоненты фронтенда** — `StatCard` и `QuickCard` уже используют `memo()`. Supabase клиент уже мемоизирован через `useMemo`.
4. **Автоприменение миграций** — убирать `MigrateAsync()` из Program.cs опасно без CI/CD pipeline.
5. **MemoryCache** — замена на Redis требует инфраструктурных изменений (выходит за рамки этапа).

## Как запустить аудит

### MiniProfiler (бекенд)
```bash
# Запустить API в Development режиме
dotnet run --project src/Barnamaj.API
# Открыть в браузере:
# http://localhost:5000/profiler/results-index
```

### Bundle Analyzer (фронтенд)
```bash
cd barnamaj-web
npm run analyze
# Откроется визуализация бандла в браузере
```

## Настройки кэширования

| Эндпоинт | Duration | Обоснование |
|----------|----------|-------------|
| GET /api/assessment/skills | 3600s (1ч) | Навыки меняются редко |
| GET /api/assessment/badges/{id} | 300s (5мин) | Бейджи обновляются при сдаче теста |
| GET /api/projects/feed | 30s | Активная лента, нужна актуальность |
| GET /api/profiles | 300s (5мин) | Поиск профилей, допустима задержка |
