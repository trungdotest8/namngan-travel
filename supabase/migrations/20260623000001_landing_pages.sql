-- Migration: tour_landing_pages — Landing Page Factory (Handover #38)

CREATE TABLE IF NOT EXISTS tour_landing_pages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id          UUID REFERENCES tours(id) ON DELETE SET NULL,
  slug             TEXT UNIQUE NOT NULL,
  headline         TEXT NOT NULL,
  sub_headline     TEXT,
  price_deal       BIGINT,
  departure_note   TEXT,
  promo_features   JSONB DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_slug    ON tour_landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_tour_id ON tour_landing_pages(tour_id);

-- RLS: chỉ service_role mới ghi được, anon đọc public (cho ISR page)
ALTER TABLE tour_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read landing pages"
  ON tour_landing_pages FOR SELECT
  USING (true);

CREATE POLICY "Service role full access landing pages"
  ON tour_landing_pages FOR ALL
  USING (auth.role() = 'service_role');
