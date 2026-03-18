# CLEANUP_REPORT.md
# Отчёт чистки зависимостей — Barnamaj
# Дата: 2026-03-15

## Результат: зависимости чисты

После полного аудита всех NuGet и npm пакетов — **неиспользуемых зависимостей не обнаружено**.

## Бекенд (NuGet) — 14/14 используются

| Пакет | Используется в |
|-------|---------------|
| Microsoft.EntityFrameworkCore | 27 файлов (Data layer) |
| Microsoft.EntityFrameworkCore.Tools | dotnet ef миграции |
| Microsoft.EntityFrameworkCore.Design | AppDbContextFactory |
| Npgsql.EntityFrameworkCore.PostgreSQL | Program.cs |
| EFCore.NamingConventions | Program.cs |
| Serilog.AspNetCore | Program.cs |
| Serilog.Sinks.Console | Program.cs |
| Serilog.Sinks.File | Program.cs |
| Swashbuckle.AspNetCore | Program.cs |
| AspNetCore.HealthChecks.NpgSql | Program.cs + HealthController |
| Microsoft.AspNetCore.Authentication.JwtBearer | ServiceExtensions.cs |
| BCrypt.Net-Next | AuthService.cs |
| FluentValidation.AspNetCore | 5 файлов валидаторов |
| MiniProfiler.AspNetCore.Mvc + EFCore | Program.cs (добавлен в этапе 1) |

## Фронтенд (npm) — 11/11 используются

| Пакет | Используется в |
|-------|---------------|
| @anthropic-ai/sdk | api/ai/tz/route.ts |
| @supabase/ssr | middleware.ts, lib/supabase-server.ts |
| @supabase/supabase-js | 15 файлов |
| canvas-confetti | projects/[id]/page.tsx, contracts |
| class-variance-authority | components/ui/button.tsx |
| clsx | lib/utils.ts |
| framer-motion | 28 файлов |
| lucide-react | 34 файла |
| next-themes | ThemeProvider + 3 компонента |
| sonner | ToasterThemeWrapper + layout |
| tailwind-merge | lib/utils.ts |

## DevDependencies — 4/4

| Пакет | Статус |
|-------|--------|
| @next/bundle-analyzer | Используется в next.config.ts |
| @playwright/test | 4+ E2E теста |
| @types/canvas-confetti | Типы для canvas-confetti |
| supabase | CLI для миграций |

## Что удалено

Ничего — все зависимости активно используются.

## Рекомендации

- `barnamaj-frontend/` (устаревший фронтенд) — рекомендуется удалить или заархивировать
