-- ============================================================
-- NAM NGÂN TRAVEL — CRM Extensions v1.0
-- Bridge giữa leads table (Next.js schema) và CRM HTML / Edge Functions
-- ============================================================

-- ── 1. Mở rộng bảng leads với các cột CRM / Edge Function ──

ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT;
-- name: CRM display name — mirror của full_name, được Edge Function ghi

ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT
  CHECK (source IN ('fb', 'web', 'zalo', 'manual'));
-- source: CRM/Edge Function granular source ('fb'|'web'|'zalo')
-- Khác với lead_source (Next.js: 'popup'|'chat'|'fb_ads'|'web_ads'...)

ALTER TABLE leads ADD COLUMN IF NOT EXISTS score SMALLINT DEFAULT 50
  CHECK (score BETWEEN 0 AND 100);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS tour TEXT;
-- Tour khách quan tâm (từ chat widget hoặc FB form)

ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget TEXT;
-- Ngân sách dự kiến (dạng text: "10-15tr")

ALTER TABLE leads ADD COLUMN IF NOT EXISTS pax SMALLINT DEFAULT 1;
-- Số người đi cùng

ALTER TABLE leads ADD COLUMN IF NOT EXISTS fb_lead_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fb_page_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fb_form_id TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm TEXT;
-- Combined UTM string từ CRM HTML (utm_source=x&utm_medium=y&...)

-- ── 2. UNIQUE constraint trên phone cho upsert (fb-webhook dùng onConflict) ──

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_phone_unique' AND conrelid = 'leads'::regclass
  ) THEN
    ALTER TABLE leads ADD CONSTRAINT leads_phone_unique UNIQUE (phone);
  END IF;
END $$;

-- ── 3. Mở rộng status CHECK để CRM HTML có thể ghi CRM status values ──
-- Existing Next.js values: 'new'|'contacted'|'consulting'|'deposited'|'converted'|'lost'
-- CRM HTML values: 'contact'|'booked'|'done'|'cancel'

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'new', 'contacted', 'consulting', 'deposited', 'converted', 'lost',
  'contact', 'booked', 'done', 'cancel'
));

-- ── 4. Trigger: tự động sync name <-> full_name ──

CREATE OR REPLACE FUNCTION sync_lead_name_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL AND (NEW.full_name IS NULL OR NEW.full_name = '') THEN
    NEW.full_name := NEW.name;
  ELSIF NEW.full_name IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
    NEW.name := NEW.full_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_sync_name ON leads;
CREATE TRIGGER leads_sync_name
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION sync_lead_name_fields();

-- ── 5. call_logs — lịch sử tương tác CRM ──

CREATE TABLE IF NOT EXISTS call_logs (
  id         BIGSERIAL    PRIMARY KEY,
  lead_id    UUID         NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type       TEXT         CHECK (type IN ('call', 'email', 'note', 'zalo')),
  note       TEXT,
  created_by TEXT         DEFAULT 'admin',
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id   ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "call_logs_anon_select" ON call_logs
  FOR SELECT TO anon USING (true);
CREATE POLICY "call_logs_anon_insert" ON call_logs
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "call_logs_admin_all" ON call_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ── 6. lead_attachments — hồ sơ đính kèm CRM (riêng với image_attachments TEXT[]) ──
-- leads.image_attachments TEXT[] giữ nguyên cho Next.js (Child D)
-- lead_attachments là related table cho CRM HTML join

CREATE TABLE IF NOT EXISTS lead_attachments (
  id            BIGSERIAL   PRIMARY KEY,
  lead_id       UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  label         TEXT,
  drive_file_id TEXT,
  drive_url     TEXT,
  thumbnail_url TEXT,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead_id ON lead_attachments(lead_id);

ALTER TABLE lead_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_attachments_anon_select" ON lead_attachments
  FOR SELECT TO anon USING (true);
CREATE POLICY "lead_attachments_anon_insert" ON lead_attachments
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "lead_attachments_admin_all" ON lead_attachments
  FOR ALL USING (auth.role() = 'service_role');

-- ── 7. webhook_logs — audit log cho Edge Function ──

CREATE TABLE IF NOT EXISTS webhook_logs (
  id             BIGSERIAL   PRIMARY KEY,
  source         TEXT,
  raw_payload    TEXT,
  leads_inserted INT         DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_logs_admin_all" ON webhook_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ── 8. Indexes bổ sung cho các cột CRM ──

CREATE INDEX IF NOT EXISTS idx_nn_leads_source   ON leads(source);
CREATE INDEX IF NOT EXISTS idx_nn_leads_score    ON leads(score);
CREATE INDEX IF NOT EXISTS idx_nn_leads_campaign ON leads(campaign);
