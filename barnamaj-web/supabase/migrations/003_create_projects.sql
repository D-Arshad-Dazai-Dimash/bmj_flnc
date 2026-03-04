-- 003_create_projects.sql — Таблица проектов (заказов) с RLS

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('open','in_progress','completed','disputed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  title       TEXT        NOT NULL,
  description TEXT,
  budget      NUMERIC(18,2),
  deadline    TIMESTAMPTZ,
  status      project_status NOT NULL DEFAULT 'open',
  client_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created ON public.projects(created_at DESC);

DROP TRIGGER IF EXISTS on_projects_updated ON public.projects;
CREATE TRIGGER on_projects_updated
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated see open or own projects"
  ON public.projects FOR SELECT TO authenticated
  USING (status = 'open' OR client_id = auth.uid());

CREATE POLICY "Only clients can insert projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'client')
  );

CREATE POLICY "Clients update own projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients delete own projects"
  ON public.projects FOR DELETE TO authenticated
  USING (client_id = auth.uid());
