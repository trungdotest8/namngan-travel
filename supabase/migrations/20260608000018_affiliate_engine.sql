-- ============================================================
-- Migration #18 — TripGenie Phase 3: Affiliate Engine
-- affiliate_links + affiliate_clicks
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider        VARCHAR(50)  NOT NULL,                    -- 'booking', 'agoda', 'klook', 'viator', 'traveloka'
  product_type    VARCHAR(50)  NOT NULL,                    -- 'hotel', 'tour', 'insurance', 'visa', 'sim', 'flight'
  label           TEXT         NOT NULL,                    -- tên hiển thị
  destination     VARCHAR(100),                             -- điểm đến liên quan
  tracking_url    TEXT         NOT NULL,                    -- URL có tracking param
  base_url        TEXT         NOT NULL,                    -- URL gốc không tracking
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,          -- % hoa hồng
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id     UUID         NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  lead_id     UUID         REFERENCES leads(id) ON DELETE SET NULL,
  session_id  VARCHAR(100),
  ip_hash     VARCHAR(64),                                  -- SHA-256 của IP (không lưu raw)
  referrer    TEXT,
  user_agent  TEXT,
  clicked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_links_provider     ON affiliate_links(provider);
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_links_product_type ON affiliate_links(product_type);
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_links_destination  ON affiliate_links(destination);
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_links_active       ON affiliate_links(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_nn_affiliate_clicks_link_id    ON affiliate_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_clicks_lead_id    ON affiliate_clicks(lead_id);
CREATE INDEX IF NOT EXISTS idx_nn_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION nn_update_affiliate_links_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_affiliate_links_updated_at ON affiliate_links;
CREATE TRIGGER trg_affiliate_links_updated_at
  BEFORE UPDATE ON affiliate_links
  FOR EACH ROW EXECUTE FUNCTION nn_update_affiliate_links_timestamp();

-- RLS
ALTER TABLE affiliate_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- affiliate_links: public read (active only), admin write
DROP POLICY IF EXISTS "affiliate_links_public_read" ON affiliate_links;
CREATE POLICY "affiliate_links_public_read"
  ON affiliate_links FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "affiliate_links_admin_all" ON affiliate_links;
CREATE POLICY "affiliate_links_admin_all"
  ON affiliate_links FOR ALL
  USING (auth.role() = 'service_role');

-- affiliate_clicks: insert-only for anon (tracking), admin read
DROP POLICY IF EXISTS "affiliate_clicks_insert_anon" ON affiliate_clicks;
CREATE POLICY "affiliate_clicks_insert_anon"
  ON affiliate_clicks FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "affiliate_clicks_admin_read" ON affiliate_clicks;
CREATE POLICY "affiliate_clicks_admin_read"
  ON affiliate_clicks FOR SELECT
  USING (auth.role() = 'service_role');

-- Seed: một số link mẫu
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
