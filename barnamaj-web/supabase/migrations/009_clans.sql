-- ── Sprint 3: Clan / Артель system ───────────────────────────────────────────

CREATE TYPE clan_role AS ENUM ('leader', 'member', 'architect');

-- ── Clans table ──────────────────────────────────────────────────────────────
CREATE TABLE clans (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE
                          CHECK (length(trim(name)) BETWEEN 2 AND 50),
  leader_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description text        CHECK (length(description) <= 500),
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clans_leader_id ON clans(leader_id);

ALTER TABLE clans ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can browse clans
CREATE POLICY clans_select ON clans FOR SELECT TO authenticated USING (true);
-- Only the leader (who must equal auth.uid()) can create
CREATE POLICY clans_insert ON clans FOR INSERT WITH CHECK (leader_id = auth.uid());
-- Only the leader can update
CREATE POLICY clans_update ON clans FOR UPDATE USING (leader_id = auth.uid());
-- Only the leader can delete
CREATE POLICY clans_delete ON clans FOR DELETE USING (leader_id = auth.uid());

-- ── Clan members table ───────────────────────────────────────────────────────
CREATE TABLE clan_members (
  clan_id   uuid      NOT NULL REFERENCES clans(id)    ON DELETE CASCADE,
  user_id   uuid      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      clan_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clan_id, user_id)
);

CREATE INDEX idx_clan_members_user_id ON clan_members(user_id);

ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view memberships
CREATE POLICY cm_select ON clan_members FOR SELECT TO authenticated USING (true);

-- A user can add themselves OR a clan leader can add someone
CREATE POLICY cm_insert ON clan_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM clans WHERE id = clan_id AND leader_id = auth.uid())
);

-- A user can remove themselves (leave) OR a clan leader can remove anyone
CREATE POLICY cm_delete ON clan_members FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM clans WHERE id = clan_id AND leader_id = auth.uid())
);

-- ── RPC: invite a user to a clan by their registered email ───────────────────
CREATE OR REPLACE FUNCTION invite_to_clan(p_clan_id uuid, p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
BEGIN
  -- Caller must be the clan's leader
  IF NOT EXISTS (
    SELECT 1 FROM clans WHERE id = p_clan_id AND leader_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized: you are not the leader of this clan';
  END IF;

  -- Look up the user by email in auth.users
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_email;
  END IF;

  -- Insert (idempotent — ON CONFLICT DO NOTHING)
  INSERT INTO clan_members (clan_id, user_id, role)
  VALUES (p_clan_id, v_uid, 'member')
  ON CONFLICT DO NOTHING;

  RETURN v_uid;
END;
$$;
