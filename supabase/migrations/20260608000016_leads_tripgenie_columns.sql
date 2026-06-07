-- ============================================================
-- Migration #16 — Leads: TripGenie extended columns
-- ADD only, no drops (rule #1: không xóa)
-- ============================================================

-- Enum mới cho source_channel (khác lead_source TEXT cũ)
DO $$ BEGIN
  CREATE TYPE lead_source_channel AS ENUM (
    'web_form', 'chatbot', 'zalo', 'facebook', 'tiktok', 'organic', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS zalo_id              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source_channel       lead_source_channel DEFAULT 'web_form',
  ADD COLUMN IF NOT EXISTS destination_interest VARCHAR(255),
  ADD COLUMN IF NOT EXISTS travel_date          DATE,
  ADD COLUMN IF NOT EXISTS budget_range         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS number_of_people     INT DEFAULT 1
                                                CHECK (number_of_people >= 1),
  ADD COLUMN IF NOT EXISTS travel_style         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS lead_score           INT DEFAULT 0
                                                CHECK (lead_score >= 0 AND lead_score <= 100);

CREATE INDEX IF NOT EXISTS idx_nn_leads_source_channel ON leads(source_channel);
CREATE INDEX IF NOT EXISTS idx_nn_leads_lead_score     ON leads(lead_score DESC);
