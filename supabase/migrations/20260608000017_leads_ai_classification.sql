-- ============================================================
-- Migration #17 — Leads: AI Classification columns
-- ADD only, no drops (rule #1: không xóa)
-- ============================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_tier VARCHAR(10)
                                   CHECK (ai_tier IN ('hot', 'warm', 'cold')),
  ADD COLUMN IF NOT EXISTS ai_tags JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_nn_leads_ai_tier ON leads(ai_tier);
CREATE INDEX IF NOT EXISTS idx_nn_leads_ai_tags ON leads USING GIN(ai_tags);
