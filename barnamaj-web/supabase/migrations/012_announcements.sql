-- ============================================================
-- 012_announcements.sql — Объявления платформы
-- ============================================================

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_active ON public.announcements(is_active, sort_order ASC);

-- RLS — публичный доступ на чтение
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active announcements"
    ON public.announcements FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- 3 тестовых записи
INSERT INTO public.announcements (title, body, sort_order) VALUES
    ('Запуск платформы Barnamaj', 'Мы рады объявить о запуске IT-платформы для фрилансеров Казахстана. Безопасные сделки, кланы разработчиков и ИИ-аттестация.', 1),
    ('Новая система аттестации', 'Теперь разработчики могут пройти ИИ-аттестацию и получить подтверждённый уровень квалификации: junior, middle или senior.', 2),
    ('Escrow-система защиты платежей', 'Все сделки на платформе защищены escrow-механизмом. Деньги замораживаются до выполнения работы и передаются исполнителю после приёмки.', 3);
