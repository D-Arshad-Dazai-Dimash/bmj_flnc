-- ============================================================
-- 016_tech_supervision.sql — Технический надзор
-- ============================================================

-- Статусы надзора
CREATE TYPE supervision_status AS ENUM ('not_required', 'assigned', 'in_progress', 'approved', 'revision');
CREATE TYPE supervision_app_status AS ENUM ('pending', 'approved', 'rejected');

-- Поля надзора к projects
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS tech_supervisor_id UUID DEFAULT NULL REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS supervision_status supervision_status DEFAULT 'not_required',
    ADD COLUMN IF NOT EXISTS supervision_report TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS repository_url TEXT DEFAULT NULL;

CREATE INDEX idx_projects_supervisor ON public.projects(tech_supervisor_id);

-- Заявки на роль технадзорщика
CREATE TABLE IF NOT EXISTS public.supervision_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status supervision_app_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE public.supervision_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own supervision apps"
    ON public.supervision_applications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supervision apps"
    ON public.supervision_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Добавить роль tech_supervisor к profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_tech_supervisor BOOLEAN NOT NULL DEFAULT false;
