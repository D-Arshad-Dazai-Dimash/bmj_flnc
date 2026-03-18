-- ============================================================
-- 015_user_features.sql — Фичи пользователей (feature flags)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, feature_name)
);

CREATE INDEX idx_user_features_user ON public.user_features(user_id);

-- RLS
ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own features"
    ON public.user_features FOR SELECT
    USING (auth.uid() = user_id);

-- Добавить is_admin к profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Добавить is_blocked к profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
