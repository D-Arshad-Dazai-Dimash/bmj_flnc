-- ============================================================
-- Barnamaj — Initial SQL Scripts
-- Выполняются автоматически при первом запуске PostgreSQL
-- Добавляйте сюда расширения, роли, начальные данные
-- ============================================================

-- Расширения для высокой нагрузки
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- UUID генерация
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Статистика запросов
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- Оптимизация GIN-индексов

-- Установить временную зону по умолчанию
SET timezone = 'UTC';
