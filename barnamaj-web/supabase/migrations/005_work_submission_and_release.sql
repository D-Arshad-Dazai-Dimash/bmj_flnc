-- 005_work_submission_and_release.sql — Сдача работы + выплата эскроу
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Новые колонки для сдачи работы ────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.contracts ADD COLUMN work_submission_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.contracts ADD COLUMN work_description TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.contracts ADD COLUMN submitted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── 2. submit_work — фрилансер сдаёт работу ─────────────────────────────────
--
--  1) Проверяет, что контракт активен и эскроу заморожен
--  2) Проверяет, что вызывающий — фрилансер контракта
--  3) Записывает URL и описание, ставит submitted_at
--

CREATE OR REPLACE FUNCTION public.submit_work(
  p_contract_id UUID,
  p_url TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_freelancer_id UUID;
  v_status        contract_status;
BEGIN
  SELECT freelancer_id, status
    INTO v_freelancer_id, v_status
    FROM public.contracts
   WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Contract is not active';
  END IF;

  IF v_freelancer_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the freelancer can submit work';
  END IF;

  UPDATE public.contracts
     SET work_submission_url = p_url,
         work_description    = p_description,
         submitted_at        = NOW(),
         updated_at          = NOW()
   WHERE id = p_contract_id;
END;
$$;

-- ── 3. release_escrow_payout — заказчик принимает и выплачивает ──────────────
--
--  1) Проверяет, что контракт активен и работа сдана
--  2) Проверяет, что вызывающий — заказчик контракта
--  3) Переводит escrow_status → released, status → completed
--  4) Переводит проект в completed
--  5) (Будущее) начисление баланса фрилансеру
--

CREATE OR REPLACE FUNCTION public.release_escrow_payout(p_contract_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id   UUID;
  v_project_id  UUID;
  v_status      contract_status;
  v_submitted   TIMESTAMPTZ;
BEGIN
  SELECT client_id, project_id, status, submitted_at
    INTO v_client_id, v_project_id, v_status, v_submitted
    FROM public.contracts
   WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Contract is not active';
  END IF;

  IF v_submitted IS NULL THEN
    RAISE EXCEPTION 'Work has not been submitted yet';
  END IF;

  IF v_client_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the client can release the payout';
  END IF;

  -- ① Обновляем контракт → released + completed
  UPDATE public.contracts
     SET escrow_status = 'released',
         status        = 'completed',
         released_at   = NOW(),
         completed_at  = NOW(),
         updated_at    = NOW()
   WHERE id = p_contract_id;

  -- ② Обновляем проект → completed
  UPDATE public.projects
     SET status     = 'completed',
         updated_at = NOW()
   WHERE id = v_project_id;

  -- ③ TODO: начисление баланса фрилансеру (future)
  -- INSERT INTO public.transactions (freelancer_id, amount, ...) ...
END;
$$;
