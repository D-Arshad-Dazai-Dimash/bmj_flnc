# Объявления платформы

## Описание

Модуль объявлений для лендинга с автоматической каруселью.

## Таблица `announcements`

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | PK |
| title | TEXT | Заголовок |
| body | TEXT | Текст объявления |
| published_at | TIMESTAMPTZ | Дата публикации |
| expires_at | TIMESTAMPTZ | Дата истечения (null = бессрочно) |
| is_active | BOOLEAN | Активно или скрыто |
| sort_order | INT | Порядок сортировки (ASC) |

## RLS

- SELECT: только `is_active = true` и `expires_at > NOW()` (или NULL)
- INSERT/UPDATE/DELETE: только через admin API (service role)

## Карусель на лендинге

- Автопрокрутка каждые 5 секунд
- Навигация стрелками и точками
- Если объявлений нет — секция не рендерится
- Анимация переключения через Framer Motion

## Миграция

```sql
-- supabase/migrations/012_announcements.sql
-- Содержит 3 тестовых записи
```

## Файлы

| Файл | Описание |
|------|----------|
| `supabase/migrations/012_announcements.sql` | Миграция + seed |
| `src/lib/database.types.ts` | Тип Announcement |
| `src/app/[lang]/page.tsx` | Карусель на лендинге |
