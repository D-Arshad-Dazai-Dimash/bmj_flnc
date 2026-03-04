-- ══════════════════════════════════════════════════════════════════════════════
-- 002_auto_create_profile_trigger.sql
-- Триггер: при регистрации через Supabase Auth → автоматически создаёт профиль
-- Выполнить в Supabase Dashboard → SQL Editor ПОСЛЕ 001_create_profiles.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Функция-триггер ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role public.user_role;
  _name TEXT;
BEGIN
  -- Читаем роль из metadata, переданного при signUp
  -- supabase.auth.signUp({ options: { data: { role: 'client', full_name: 'John' } } })
  _role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::public.user_role,
    'freelancer'
  );

  _name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, full_name, role, avatar_url, bio)
  VALUES (
    NEW.id,
    _name,
    _role,
    NEW.raw_user_meta_data ->> 'avatar_url',
    ''
  )
  ON CONFLICT (id) DO NOTHING;  -- идемпотентность

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Привязка к auth.users ───────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
