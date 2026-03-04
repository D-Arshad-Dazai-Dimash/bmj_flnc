-- ── Sprint 3: Chat messages inside contracts ─────────────────────────────────

CREATE TABLE messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  reply_to_id uuid        REFERENCES messages(id)           ON DELETE SET NULL,
  text        text        NOT NULL CHECK (length(trim(text)) > 0 AND length(text) <= 2000),
  is_read     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_contract_id ON messages(contract_id, created_at);
CREATE INDEX idx_messages_sender_id   ON messages(sender_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Only contract participants (client + freelancer) can read messages
CREATE POLICY msg_select ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = messages.contract_id
        AND (c.client_id = auth.uid() OR c.freelancer_id = auth.uid())
    )
  );

-- Participants can send messages; sender_id must equal their own uid
CREATE POLICY msg_insert ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = messages.contract_id
        AND (c.client_id = auth.uid() OR c.freelancer_id = auth.uid())
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
