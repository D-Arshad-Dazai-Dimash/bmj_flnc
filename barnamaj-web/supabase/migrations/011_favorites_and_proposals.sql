-- ============================================================
-- 011_favorites_and_proposals.sql — Избранное + расширение предложений
-- ============================================================

-- ── Таблица избранного ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_project_id ON public.favorites(project_id);

-- RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);

-- ── Добавить deadline_days к project_applications ───────────
ALTER TABLE public.project_applications
    ADD COLUMN IF NOT EXISTS deadline_days INT DEFAULT NULL;
