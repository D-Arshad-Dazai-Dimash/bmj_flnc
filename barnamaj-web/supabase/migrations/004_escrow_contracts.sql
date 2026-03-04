-- 004_escrow_contracts.sql — Отклики, контракты (Эскроу) + RLS + DB-функция
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Enum-ы ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM ('pending','accepted','rejected','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('active','completed','disputed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.escrow_status AS ENUM ('frozen','released','refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Добавляем executor_id к projects (если нет) ──────────────────────────

DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN executor_id UUID REFERENCES public.profiles(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Добавляем 'cancelled' к project_status если отсутствует
DO $$ BEGIN
  ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Таблица откликов ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_applications (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  project_id      UUID              NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  freelancer_id   UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter    TEXT,
  proposed_budget NUMERIC(18,2),
  status          application_status NOT NULL DEFAULT 'pending',

  CONSTRAINT uq_application UNIQUE (project_id, freelancer_id)
);

CREATE INDEX IF NOT EXISTS idx_appls_project   ON public.project_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_appls_freelancer ON public.project_applications(freelancer_id);

ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;

-- Заказчик видит отклики на свои проекты; фрилансер видит свои отклики
CREATE POLICY "See own applications"
  ON public.project_applications FOR SELECT TO authenticated
  USING (
    freelancer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid()
    )
  );

-- Фрилансер создаёт отклик
CREATE POLICY "Freelancers insert applications"
  ON public.project_applications FOR INSERT TO authenticated
  WITH CHECK (
    freelancer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'freelancer')
  );

-- Фрилансер может отозвать свой отклик (update status → withdrawn)
CREATE POLICY "Freelancers update own applications"
  ON public.project_applications FOR UPDATE TO authenticated
  USING (freelancer_id = auth.uid())
  WITH CHECK (freelancer_id = auth.uid());

-- ── 4. Таблица контрактов (эскроу) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contracts (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  project_id      UUID            NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id       UUID            NOT NULL REFERENCES public.profiles(id),
  freelancer_id   UUID            NOT NULL REFERENCES public.profiles(id),
  application_id  UUID            NOT NULL REFERENCES public.project_applications(id),

  -- Финансы
  amount          NUMERIC(18,2)   NOT NULL CHECK (amount > 0),
  platform_fee    NUMERIC(18,2)   NOT NULL DEFAULT 0,
  escrow_status   escrow_status   NOT NULL DEFAULT 'frozen',

  -- Статус контракта
  status          contract_status NOT NULL DEFAULT 'active',

  -- Временные метки ключевых событий
  frozen_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  released_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  disputed_at     TIMESTAMPTZ,

  CONSTRAINT uq_contract_project UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_contracts_client     ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_freelancer  ON public.contracts(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status      ON public.contracts(status);

DROP TRIGGER IF EXISTS on_contracts_updated ON public.contracts;
CREATE TRIGGER on_contracts_updated
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Обе стороны видят свои контракты
CREATE POLICY "Parties see own contracts"
  ON public.contracts FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR freelancer_id = auth.uid());

-- Только через DB-функцию (ниже) создаются контракты,
-- но RLS INSERT нужен для SECURITY DEFINER-функций
CREATE POLICY "System insert contracts"
  ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Обе стороны могут обновлять (для release/dispute)
CREATE POLICY "Parties update own contracts"
  ON public.contracts FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR freelancer_id = auth.uid());

-- ── 5. Обновляем RLS projects — исполнитель тоже видит свои проекты ─────────

DROP POLICY IF EXISTS "Authenticated see open or own projects" ON public.projects;
CREATE POLICY "Authenticated see open or own projects"
  ON public.projects FOR SELECT TO authenticated
  USING (
    status = 'open'
    OR client_id = auth.uid()
    OR executor_id = auth.uid()
  );

-- ── 6. DB-функция accept_application — атомарная бизнес-транзакция ───────────
--
--  1) Проверяет, что вызывающий — заказчик проекта
--  2) Проверяет, что проект в статусе 'open'
--  3) Создаёт контракт с замороженным бюджетом
--  4) Обновляет статус проекта → 'in_progress' + executor_id
--  5) Принимает отклик (accepted), отклоняет остальные (rejected)
--
-- Возвращает id созданного контракта.

CREATE OR REPLACE FUNCTION public.accept_application(p_application_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id    UUID;
  v_client_id     UUID;
  v_freelancer_id UUID;
  v_budget        NUMERIC(18,2);
  v_contract_id   UUID;
  v_fee           NUMERIC(18,2);
BEGIN
  -- Получаем данные отклика
  SELECT pa.project_id, pa.freelancer_id
    INTO v_project_id, v_freelancer_id
    FROM public.project_applications pa
   WHERE pa.id = p_application_id
     AND pa.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not pending';
  END IF;

  -- Получаем проект
  SELECT p.client_id, COALESCE(p.budget, 0)
    INTO v_client_id, v_budget
    FROM public.projects p
   WHERE p.id = v_project_id
     AND p.status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or not open';
  END IF;

  -- Проверяем, что вызывающий — заказчик
  IF v_client_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the project owner can accept applications';
  END IF;

  -- Считаем комиссию платформы (5%)
  v_fee := ROUND(v_budget * 0.05, 2);

  -- ① Создаём контракт (эскроу)
  INSERT INTO public.contracts (
    project_id, client_id, freelancer_id, application_id,
    amount, platform_fee, escrow_status, status, frozen_at
  ) VALUES (
    v_project_id, v_client_id, v_freelancer_id, p_application_id,
    v_budget, v_fee, 'frozen', 'active', NOW()
  )
  RETURNING id INTO v_contract_id;

  -- ② Обновляем проект → in_progress + назначаем исполнителя
  UPDATE public.projects
     SET status      = 'in_progress',
         executor_id = v_freelancer_id,
         updated_at  = NOW()
   WHERE id = v_project_id;

  -- ③ Принимаем этот отклик
  UPDATE public.project_applications
     SET status = 'accepted'
   WHERE id = p_application_id;

  -- ④ Отклоняем остальные отклики на этот проект
  UPDATE public.project_applications
     SET status = 'rejected'
   WHERE project_id = v_project_id
     AND id != p_application_id
     AND status = 'pending';

  RETURN v_contract_id;
END;
$$;
