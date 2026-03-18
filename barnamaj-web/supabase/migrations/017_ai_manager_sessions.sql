-- ============================================================
-- 017_ai_manager_sessions.sql — Сессии ИИ Менеджера ТЗ
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_manager_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Новая сессия',
    messages JSONB NOT NULL DEFAULT '[]',
    tz_result TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_manager_sessions_user ON public.ai_manager_sessions(user_id);

ALTER TABLE public.ai_manager_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
    ON public.ai_manager_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
