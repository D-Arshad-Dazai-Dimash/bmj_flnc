# Технический надзор

## Описание

Роль технадзорщика (tech_supervisor) для контроля качества заказов пакета 3 (>500К ₸).

## Условия

- Только разработчики с `attestation_level = 'senior'` и `attestation_specialization = 'fullstack'` могут подать заявку
- Администратор одобряет заявку через `/admin/supervision`
- Одобренные получают `is_tech_supervisor = true` в profiles

## Видимость заказов пакета 3

Заказы с `package_tier = 3` отображаются только если пользователь:
- Senior fullstack (по аттестации)

## Дашборд технадзорщика

`/dashboard/supervision` — список назначенных заказов пакета 3:

- Название, клиент, исполнитель, бюджет
- Ссылка на репозиторий
- Чеклист проверки:
  - ТЗ выполнено
  - Код проверен
  - Тесты пройдены
  - Документация присутствует
- Textarea для отчёта
- Кнопки: "Подтвердить выполнение" / "На доработку"

## Распределение (Пакет 3)

При подтверждении через release:
- 90% — исполнителю
- 3% — технадзорщику
- 7% — платформе

## API

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/supervision/apply` | Подать заявку на технадзор |

## Таблицы

### Поля в `projects`
- `tech_supervisor_id` — UUID, FK
- `supervision_status` — ENUM: not_required, assigned, in_progress, approved, revision
- `supervision_report` — TEXT
- `repository_url` — TEXT

### `supervision_applications`
- id, user_id (UNIQUE), status (pending/approved/rejected), created_at

## Файлы

| Файл | Описание |
|------|----------|
| `supabase/migrations/016_tech_supervision.sql` | Миграция |
| `src/app/[lang]/dashboard/supervision/page.tsx` | Дашборд надзорщика |
| `src/app/api/supervision/apply/route.ts` | API заявки |
