-- ============================================================
-- 014_payment_tables.sql — Платёжная система
-- ============================================================

CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payout_status  AS ENUM ('pending', 'processed');

-- Платежи
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES auth.users(id),
    amount_tiyn BIGINT NOT NULL,
    commission_tiyn BIGINT NOT NULL DEFAULT 0,
    status payment_status NOT NULL DEFAULT 'pending',
    gateway_payment_id TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_payer_id ON public.payments(payer_id);

-- Escrow-блокировка
CREATE TABLE IF NOT EXISTS public.payment_escrow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    held_amount_tiyn BIGINT NOT NULL,
    released_at TIMESTAMPTZ DEFAULT NULL,
    released_to_user_id UUID DEFAULT NULL REFERENCES auth.users(id)
);

CREATE INDEX idx_payment_escrow_payment_id ON public.payment_escrow(payment_id);

-- Выплаты
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount_tiyn BIGINT NOT NULL,
    status payout_status NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_user_id ON public.payouts(user_id);

-- Логи платежей
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_logs_payment_id ON public.payment_logs(payment_id);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_escrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Пользователь видит свои платежи
CREATE POLICY "Users see own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = payer_id);

CREATE POLICY "Users see own payouts"
    ON public.payouts FOR SELECT
    USING (auth.uid() = user_id);
