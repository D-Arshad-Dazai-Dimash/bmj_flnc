# ИИ Менеджер ТЗ (Gemini)

## Описание

Виджет-помощник на базе Gemini для составления технического задания через диалог.

## Принцип работы

1. Пользователь описывает проект
2. ИИ задаёт уточняющие вопросы (3-7 штук)
3. В процессе предлагает технические концепты — `[CONCEPT]...[/CONCEPT]`
4. Когда информации достаточно — генерирует ТЗ: `[TZ_START]...[TZ_END]`

## Feature flag

Функция доступна только пользователям с `ai_manager = true` в таблице `user_features`.
Администратор включает через `/admin/features`.

## API

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/ai-manager/chat` | Отправить сообщение Gemini |

### POST /api/ai-manager/chat

**Body:**
```json
{
  "message": "Хочу CRM-систему для автосалона",
  "history": [{"role": "user", "parts": "..."}, {"role": "model", "parts": "..."}],
  "userId": "uuid"
}
```

**Response:**
```json
{
  "reply": "Текст ответа с тегами [CONCEPT]...[/CONCEPT] или [TZ_START]...[TZ_END]",
  "type": "text | concept | tz"
}
```

## Виджет

- Плавающая кнопка (bottom-right) — открывает окно чата
- Окно перетаскивается за заголовок (native JS drag)
- Позиция сохраняется в `localStorage`
- История чата сохраняется в `localStorage`
- Парсинг специальных тегов:
  - `[CONCEPT]` → карточка с иконкой "Концепт"
  - `[TZ_START]...[TZ_END]` → блок ТЗ с кнопками "Скопировать" и "Сохранить"

## Переменные окружения

| Переменная | Описание |
|-----------|----------|
| `GEMINI_API_KEY` | API-ключ Google Generative AI |
| `GEMINI_MODEL` | Модель (по умолчанию `gemini-1.5-pro`) |

## Таблицы

### `ai_manager_sessions`

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | PK |
| user_id | UUID | FK -> auth.users |
| title | TEXT | Название сессии |
| messages | JSONB | История сообщений |
| tz_result | TEXT | Итоговое ТЗ |
| created_at | TIMESTAMPTZ | Дата создания |
| updated_at | TIMESTAMPTZ | Дата обновления |

## Файлы

| Файл | Описание |
|------|----------|
| `supabase/migrations/017_ai_manager_sessions.sql` | Миграция |
| `src/app/api/ai-manager/chat/route.ts` | API endpoint |
| `src/components/AiManagerWidget.tsx` | Виджет чата |
