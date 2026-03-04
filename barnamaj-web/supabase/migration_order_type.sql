-- ============================================================
-- MIGRATION: Добавить тип заказа в таблицу projects
-- Выполнить в: Supabase → SQL Editor
-- ============================================================

-- 1. Добавляем поле order_type
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'PROJECT';

-- 2. Ограничиваем допустимые значения
ALTER TABLE projects
  ADD CONSTRAINT projects_order_type_check
  CHECK (order_type IN ('PROJECT', 'OUTSTAFF', 'AUDIT', 'SUPERVISION', 'CONSULTATION'));

-- 3. Индекс для быстрой фильтрации по типу
CREATE INDEX IF NOT EXISTS idx_projects_order_type ON projects (order_type);

-- Готово. Все существующие проекты получат order_type = 'PROJECT'.
