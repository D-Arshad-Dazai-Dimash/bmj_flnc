-- ============================================================
-- 013_package_tier.sql — Тарифные пакеты к заказам
-- ============================================================

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS package_tier INT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS commission_amount BIGINT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS total_amount BIGINT DEFAULT NULL;

-- package_tier: 1, 2 или 3
ALTER TABLE public.projects
    ADD CONSTRAINT chk_package_tier CHECK (package_tier IS NULL OR package_tier IN (1, 2, 3));
