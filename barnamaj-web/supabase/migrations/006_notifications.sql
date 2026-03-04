-- ============================================================
-- 006 — Notifications table + realtime triggers
-- ============================================================

-- ── 1. Enum: notification type ───────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM (
      'new_application',      -- фрилансер подал отклик
      'application_accepted', -- заказчик принял отклик
      'work_submitted',       -- фрилансер сдал работу
      'escrow_released',      -- заказчик выплатил
      'info'                  -- прочие системные
    );
  END IF;
END $$;

-- ── 2. Notifications table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL DEFAULT '',
  type       public.notification_type NOT NULL DEFAULT 'info',
  link       TEXT,                          -- optional in-app link
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service-role / triggers can INSERT (no RLS restriction for inserts via SECURITY DEFINER)
DROP POLICY IF EXISTS "Service insert notifications" ON public.notifications;
CREATE POLICY "Service insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ── 3. Enable Realtime for notifications ─────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ── 4. Helper: insert notification (SECURITY DEFINER) ────────
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id  UUID,
  p_title    TEXT,
  p_message  TEXT,
  p_type     public.notification_type DEFAULT 'info',
  p_link     TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link);
END;
$$;

-- ── 5. Mark notification(s) as read ──────────────────────────
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
  p_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
     SET is_read = true
   WHERE id = ANY(p_ids)
     AND user_id = auth.uid();
END;
$$;

-- mark ALL as read for current user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
     SET is_read = true
   WHERE user_id = auth.uid()
     AND is_read = false;
END;
$$;

-- ── 6. Trigger: new_application → notify client ──────────────
CREATE OR REPLACE FUNCTION public.trg_notify_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project   RECORD;
  v_freelancer TEXT;
BEGIN
  -- Only fire on INSERT
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;

  SELECT p.title, p.client_id
    INTO v_project
    FROM public.projects p
   WHERE p.id = NEW.project_id;

  SELECT pr.full_name INTO v_freelancer
    FROM public.profiles pr
   WHERE pr.id = NEW.freelancer_id;

  PERFORM public.create_notification(
    v_project.client_id,
    'Новый отклик',
    COALESCE(v_freelancer, 'Фрилансер') || ' откликнулся на «' || COALESCE(v_project.title, 'проект') || '»',
    'new_application',
    '/dashboard/projects/' || NEW.project_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_application ON public.project_applications;
CREATE TRIGGER on_new_application
  AFTER INSERT ON public.project_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_new_application();

-- ── 7. Trigger: application accepted (contract created) → notify freelancer ──
CREATE OR REPLACE FUNCTION public.trg_notify_contract_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;

  SELECT p.title INTO v_project_title
    FROM public.projects p
   WHERE p.id = NEW.project_id;

  PERFORM public.create_notification(
    NEW.freelancer_id,
    'Отклик принят!',
    'Ваш отклик на «' || COALESCE(v_project_title, 'проект') || '» принят. Контракт создан, средства заморожены.',
    'application_accepted',
    '/dashboard/contracts'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contract_created ON public.contracts;
CREATE TRIGGER on_contract_created
  AFTER INSERT ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_contract_created();

-- ── 8. Trigger: escrow released → notify freelancer ──────────
CREATE OR REPLACE FUNCTION public.trg_notify_escrow_released()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title TEXT;
BEGIN
  -- Fire only when escrow_status changes to 'released'
  IF OLD.escrow_status = 'released' THEN RETURN NEW; END IF;
  IF NEW.escrow_status <> 'released' THEN RETURN NEW; END IF;

  SELECT p.title INTO v_project_title
    FROM public.projects p
   WHERE p.id = NEW.project_id;

  PERFORM public.create_notification(
    NEW.freelancer_id,
    'Оплата получена! 🎉',
    'Заказчик принял работу по «' || COALESCE(v_project_title, 'проект') || '». Средства выплачены.',
    'escrow_released',
    '/dashboard/contracts'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_escrow_released ON public.contracts;
CREATE TRIGGER on_escrow_released
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_escrow_released();

-- ── 9. Trigger: work submitted → notify client ───────────────
CREATE OR REPLACE FUNCTION public.trg_notify_work_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title TEXT;
BEGIN
  IF OLD.submitted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.submitted_at IS NULL THEN RETURN NEW; END IF;

  SELECT p.title INTO v_project_title
    FROM public.projects p
   WHERE p.id = NEW.project_id;

  PERFORM public.create_notification(
    NEW.client_id,
    'Работа сдана',
    'Фрилансер сдал работу по «' || COALESCE(v_project_title, 'проект') || '». Проверьте результат.',
    'work_submitted',
    '/dashboard/projects/' || NEW.project_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_work_submitted ON public.contracts;
CREATE TRIGGER on_work_submitted
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_work_submitted();
