# ИИ-аттестация программистов (Anthropic Claude)

## Описание

Модуль аттестации позволяет разработчикам пройти интервью с ИИ (Claude) для получения уровня квалификации (junior / middle / senior).

## Flow работы

1. Разработчик выбирает специализацию (frontend / backend / fullstack / mobile)
2. Открывается чат с ИИ-интервьюером
3. ИИ задаёт 10 вопросов от простых к сложным
4. После каждого ответа даёт краткую оценку
5. После 10-го вопроса выдаёт итог: уровень, балл (0-100), развёрнутый отзыв
6. Результат сохраняется в БД, обновляется профиль пользователя
7. Повторная аттестация доступна через 30 дней

## Дополнительные возможности

- **Таймер 30 минут** — ограничение времени на сессию
- **Голосовой ввод** — кнопка микрофона (Web Speech API)
- **Голосовой вывод** — озвучка вопросов (speechSynthesis)

## Конфигурация

Переменные окружения (`.env.local`):

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

## Структура БД

### Таблица `attestations`

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| specialization | ENUM | frontend, backend, fullstack, mobile |
| level | ENUM | junior, middle, senior |
| score | INT | 0-100 |
| feedback | TEXT | Развёрнутый отзыв |
| completed_at | TIMESTAMPTZ | Дата завершения |
| can_retake_at | TIMESTAMPTZ | completed_at + 30 дней |

### Поля в `profiles`

- `attestation_level` — текущий уровень
- `attestation_specialization` — специализация

## API

### POST /api/attestation

Streaming чат с Anthropic Claude.

**Тело запроса:**
```json
{
  "specialization": "frontend",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Ответ:** streaming text (SSE)

Парсинг результата: ИИ оборачивает итог в `[RESULT]{"level":"...","score":...,"feedback":"..."}[/RESULT]`

## Файлы

| Файл | Описание |
|------|----------|
| `supabase/migrations/010_attestations.sql` | Миграция БД |
| `src/app/api/attestation/route.ts` | API route (streaming) |
| `src/components/dashboard/AttestationBlock.tsx` | UI компонент |

## Миграция

Выполнить в Supabase SQL Editor:
```sql
-- Содержимое файла supabase/migrations/010_attestations.sql
```
