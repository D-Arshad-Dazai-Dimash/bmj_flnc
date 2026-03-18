# Дашборд администратора

## Описание

Полноценная административная панель для управления платформой.

## Защита

- Поле `is_admin` в таблице `profiles` — определяет доступ
- Layout проверяет `is_admin` через Supabase и перенаправляет на dashboard если не админ
- Первый админ создаётся вручную в Supabase SQL:
  ```sql
  UPDATE profiles SET is_admin = true WHERE id = 'USER_UUID';
  ```

## Разделы

### /admin — Обзор
Виджеты: пользователи, заказы, активные заказы, платежи.

### /admin/announcements — CRUD объявления
- Добавление/удаление объявлений
- Drag & drop сортировка (HTML5 DnD)
- Переключение активности

### /admin/users — Управление пользователями
- Таблица с поиском по имени
- Изменение роли (freelancer/client)
- Назначение/снятие админа
- Блокировка/разблокировка

### /admin/orders — Все заказы
- Таблица с фильтром по статусу
- Принудительное изменение статуса
- Информация о пакете и бюджете

### /admin/chats — Модерация чатов
- Список всех чатов (контрактов)
- Просмотр сообщений (только чтение)
- Автовыделение подозрительных паттернов: email, телефон, @username, ссылки

### /admin/features — Управление фичами
- Таблица пользователей с toggle-колонками
- Включение/выключение `ai_manager` для пользователей

### /admin/supervision — Технадзор
- Список заказов пакета 3
- Информация о клиенте и бюджете

## Таблица `user_features`

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | PK |
| user_id | UUID | FK -> auth.users |
| feature_name | TEXT | Название фичи (ai_manager) |
| enabled | BOOLEAN | Включена/выключена |

UNIQUE(user_id, feature_name)

## Поля в `profiles`

- `is_admin` — BOOLEAN, право на админ-панель
- `is_blocked` — BOOLEAN, заблокирован ли пользователь

## Файлы

| Файл | Описание |
|------|----------|
| `supabase/migrations/015_user_features.sql` | Миграция |
| `src/app/[lang]/admin/layout.tsx` | Layout с sidebar |
| `src/app/[lang]/admin/page.tsx` | Обзор |
| `src/app/[lang]/admin/announcements/page.tsx` | CRUD объявлений |
| `src/app/[lang]/admin/users/page.tsx` | Пользователи |
| `src/app/[lang]/admin/orders/page.tsx` | Заказы |
| `src/app/[lang]/admin/chats/page.tsx` | Модерация чатов |
| `src/app/[lang]/admin/features/page.tsx` | Feature flags |
| `src/app/[lang]/admin/supervision/page.tsx` | Технадзор |
