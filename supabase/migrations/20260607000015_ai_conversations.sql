-- Migration #15: AI Conversations + slug cho featured_destinations
-- TripGenie Phase 1 — lưu lịch sử hội thoại AI

CREATE TABLE IF NOT EXISTS ai_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text NOT NULL,
  lead_id     uuid REFERENCES leads(id) ON DELETE SET NULL,
  messages    jsonb NOT NULL DEFAULT '[]'::jsonb,
  context     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_conversations_session_idx ON ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS ai_conversations_lead_idx    ON ai_conversations(lead_id);

DROP TRIGGER IF EXISTS ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_ai_conversations" ON ai_conversations;
CREATE POLICY "service_role_ai_conversations"
  ON ai_conversations USING (true) WITH CHECK (true);

-- Thêm slug vào featured_destinations (dùng cho /diem-den/[slug])
ALTER TABLE featured_destinations
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS featured_destinations_slug_idx
  ON featured_destinations(slug)
  WHERE slug IS NOT NULL;
