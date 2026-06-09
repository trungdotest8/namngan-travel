-- ============================================================
-- APPLY CLOUD — Migrations #16 → #17 → #18 → #19
-- Chạy trong: Supabase Dashboard → SQL Editor
-- Script idempotent: chạy lại không bị lỗi
-- ============================================================

-- ── #16: Leads TripGenie columns ─────────────────────────────
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

-- ── #17: Leads AI Classification columns ─────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_tier VARCHAR(10)
                                   CHECK (ai_tier IN ('hot', 'warm', 'cold')),
  ADD COLUMN IF NOT EXISTS ai_tags JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_nn_leads_ai_tier ON leads(ai_tier);
CREATE INDEX IF NOT EXISTS idx_nn_leads_ai_tags ON leads USING GIN(ai_tags);

-- ── #18: Affiliate Engine ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider        VARCHAR(50)  NOT NULL,
  product_type    VARCHAR(50)  NOT NULL,
  label           TEXT         NOT NULL,
  destination     VARCHAR(100),
  tracking_url    TEXT         NOT NULL,
  base_url        TEXT         NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id     UUID        NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  lead_id     UUID        REFERENCES leads(id) ON DELETE SET NULL,
  session_id  VARCHAR(100),
  ip_hash     VARCHAR(64),
  referrer    TEXT,
  user_agent  TEXT,
  clicked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nn_affiliate_links_provider     ON affiliate_links(provider);
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_links_product_type ON affiliate_links(product_type);
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_links_destination  ON affiliate_links(destination);
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_links_active       ON affiliate_links(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_nn_affiliate_clicks_link_id    ON affiliate_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_clicks_lead_id    ON affiliate_clicks(lead_id);
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at DESC);

CREATE OR REPLACE FUNCTION nn_update_affiliate_links_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_affiliate_links_updated_at ON affiliate_links;
CREATE TRIGGER trg_affiliate_links_updated_at
  BEFORE UPDATE ON affiliate_links
  FOR EACH ROW EXECUTE FUNCTION nn_update_affiliate_links_timestamp();

ALTER TABLE affiliate_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_links_public_read" ON affiliate_links;
CREATE POLICY "affiliate_links_public_read"
  ON affiliate_links FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "affiliate_links_admin_all" ON affiliate_links;
CREATE POLICY "affiliate_links_admin_all"
  ON affiliate_links FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "affiliate_clicks_insert_anon" ON affiliate_clicks;
CREATE POLICY "affiliate_clicks_insert_anon"
  ON affiliate_clicks FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "affiliate_clicks_admin_read" ON affiliate_clicks;
CREATE POLICY "affiliate_clicks_admin_read"
  ON affiliate_clicks FOR SELECT
  USING (auth.role() = 'service_role');

INSERT INTO affiliate_links (provider, product_type, label, destination, tracking_url, base_url, commission_rate)
VALUES
  ('booking', 'hotel', 'Khách sạn Trung Quốc — Booking.com', 'Trung Quốc',
   'https://www.booking.com/country/cn.vi.html?aid=namngan', 'https://www.booking.com/country/cn.vi.html', 4.00),
  ('agoda',   'hotel', 'Khách sạn Trung Quốc — Agoda',       'Trung Quốc',
   'https://www.agoda.com/pages/agoda/default/DestinationSearchResult.aspx?cid=namngan&country=China',
   'https://www.agoda.com/pages/agoda/default/DestinationSearchResult.aspx?country=China', 5.00),
  ('klook',   'tour',  'Tour Trung Quốc — Klook',            'Trung Quốc',
   'https://www.klook.com/vi/destination/104-china-things-to-do/?aid=namngan',
   'https://www.klook.com/vi/destination/104-china-things-to-do/', 8.00)
ON CONFLICT DO NOTHING;

-- ── #19: Lead Activities ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_activities (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID         NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  staff_name  VARCHAR(100) NOT NULL DEFAULT 'Hệ thống',
  action_type VARCHAR(50)  NOT NULL,
  content     TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nn_lead_activities_lead_id    ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_nn_lead_activities_created_at ON lead_activities(created_at DESC);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_activities_admin_all"   ON lead_activities;
DROP POLICY IF EXISTS "lead_activities_anon_insert" ON lead_activities;

CREATE POLICY "lead_activities_admin_all"
  ON lead_activities FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "lead_activities_anon_insert"
  ON lead_activities FOR INSERT
  WITH CHECK (true);

-- ── Verify: kiểm tra bảng đã tạo ─────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('affiliate_links', 'affiliate_clicks', 'lead_activities', 'ai_conversations')
ORDER BY table_name;

-- Kết quả mong đợi: 4 dòng
-- ai_conversations | affiliate_clicks | affiliate_links | lead_activities
