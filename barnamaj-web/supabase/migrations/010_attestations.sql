-- ============================================================
-- 010_attestations.sql — Таблица аттестаций программистов
-- ============================================================

-- Enum специализаций
CREATE TYPE attestation_specialization AS ENUM ('frontend', 'backend', 'fullstack', 'mobile');

-- Enum уровней
CREATE TYPE attestation_level AS ENUM ('junior', 'middle', 'senior');

-- Таблица аттестаций
CREATE TABLE IF NOT EXISTS public.attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    specialization attestation_specialization NOT NULL,
    level attestation_level NOT NULL,
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    feedback TEXT NOT NULL DEFAULT '',
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    can_retake_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_attestations_user_id ON public.attestations(user_id);
CREATE INDEX idx_attestations_completed_at ON public.attestations(completed_at DESC);

-- Добавить поле attestation_level к profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS attestation_level attestation_level DEFAULT NULL;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS attestation_specialization attestation_specialization DEFAULT NULL;

-- RLS
ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;

-- Пользователь видит свои аттестации
CREATE POLICY "Users can view own attestations"
    ON public.attestations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Вставка через API (service role)
CREATE POLICY "Service role can insert attestations"
    ON public.attestations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Публичный доступ к уровню аттестации в profiles
-- (attestation_level уже доступен через существующие policies profiles)
