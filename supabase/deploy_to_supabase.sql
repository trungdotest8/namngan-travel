-- ============================================================
-- NAM NGÂN TRAVEL — FULL DEPLOY SCRIPT
-- Paste toàn bộ file này vào Supabase SQL Editor và Run
-- Dashboard → SQL Editor → New query → Paste → Run (F5)
-- ============================================================

-- Bước 1: Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TOURS & TOUR_SCHEDULES
-- ============================================================

CREATE TABLE IF NOT EXISTS tours (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  destination   TEXT,
  duration_days SMALLINT,
  description   TEXT,
  highlights    TEXT,
  itinerary     JSONB,
  includes      TEXT[],
  excludes      TEXT[],
  thumbnail_url TEXT,
  gallery_urls  TEXT[],
  category      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sheets_row_id TEXT,
  synced_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tour_schedules (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id        UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  return_date    DATE NOT NULL,
  price_adult    NUMERIC(12,0) NOT NULL,
  price_child    NUMERIC(12,0) NOT NULL DEFAULT 0,
  seats_total    SMALLINT NOT NULL,
  seats_booked   SMALLINT NOT NULL DEFAULT 0,
  meeting_point  TEXT,
  transport      TEXT,
  status         TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','full','cancelled','completed')),
  sheets_row_id  TEXT,
  synced_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_nn_seats CHECK (seats_booked <= seats_total),
  CONSTRAINT chk_nn_dates CHECK (return_date >= departure_date)
);

CREATE INDEX IF NOT EXISTS idx_nn_tour_schedules_tour_id        ON tour_schedules(tour_id);
CREATE INDEX IF NOT EXISTS idx_nn_tour_schedules_departure_date ON tour_schedules(departure_date);
CREATE INDEX IF NOT EXISTS idx_nn_tour_schedules_status         ON tour_schedules(status);
CREATE INDEX IF NOT EXISTS idx_nn_tours_slug                    ON tours(slug);
CREATE INDEX IF NOT EXISTS idx_nn_tours_category                ON tours(category);
CREATE INDEX IF NOT EXISTS idx_nn_tours_is_active               ON tours(is_active);

-- ============================================================
-- 2. USERS, WALLETS & WALLET_TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id       UUID UNIQUE,
  full_name     TEXT NOT NULL,
  phone         TEXT UNIQUE,
  email         TEXT UNIQUE,
  avatar_url    TEXT,
  date_of_birth DATE,
  gender        TEXT CHECK (gender IN ('male','female','other')),
  address       TEXT,
  role          TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('member','staff','admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance    NUMERIC(14,0) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id      UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  booking_id     UUID,
  type           TEXT NOT NULL
                 CHECK (type IN ('deposit','withdrawal','refund','payment','bonus')),
  amount         NUMERIC(14,0) NOT NULL,
  balance_before NUMERIC(14,0) NOT NULL,
  balance_after  NUMERIC(14,0) NOT NULL,
  note           TEXT,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nn_users_phone           ON users(phone);
CREATE INDEX IF NOT EXISTS idx_nn_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_nn_users_auth_id         ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_nn_wallet_txn_wallet_id  ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_nn_wallet_txn_booking_id ON wallet_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_nn_wallet_txn_type       ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_nn_wallet_txn_created_at ON wallet_transactions(created_at DESC);

-- ============================================================
-- 3. BOOKINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT UNIQUE NOT NULL,
  user_id          UUID NOT NULL REFERENCES users(id),
  tour_schedule_id UUID NOT NULL REFERENCES tour_schedules(id),
  adults           SMALLINT NOT NULL DEFAULT 1 CHECK (adults >= 1),
  children         SMALLINT NOT NULL DEFAULT 0 CHECK (children >= 0),
  price_adult      NUMERIC(12,0) NOT NULL,
  price_child      NUMERIC(12,0) NOT NULL DEFAULT 0,
  total_price      NUMERIC(14,0) GENERATED ALWAYS AS
                   (adults * price_adult + children * price_child) STORED,
  discount_amount  NUMERIC(14,0) NOT NULL DEFAULT 0,
  final_price      NUMERIC(14,0) GENERATED ALWAYS AS
                   (adults * price_adult + children * price_child - discount_amount) STORED,
  payment_method   TEXT CHECK (payment_method IN ('wallet','bank_transfer','cash','online')),
  payment_status   TEXT NOT NULL DEFAULT 'pending'
                   CHECK (payment_status IN ('pending','partial','paid','refunded')),
  booking_status   TEXT NOT NULL DEFAULT 'pending'
                   CHECK (booking_status IN ('pending','confirmed','cancelled','completed')),
  contact_name     TEXT NOT NULL,
  contact_phone    TEXT NOT NULL,
  contact_email    TEXT,
  special_requests TEXT,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_nn_wallet_txn_booking'
      AND table_name = 'wallet_transactions'
  ) THEN
    ALTER TABLE wallet_transactions
      ADD CONSTRAINT fk_nn_wallet_txn_booking
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_nn_bookings_user_id          ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_nn_bookings_tour_schedule_id ON bookings(tour_schedule_id);
CREATE INDEX IF NOT EXISTS idx_nn_bookings_booking_status   ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_nn_bookings_payment_status   ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_nn_bookings_created_at       ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nn_bookings_code             ON bookings(code);

-- ============================================================
-- 4. ARTICLES (CMS + RSS / TikTok)
-- ============================================================

CREATE TABLE IF NOT EXISTS articles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  summary       TEXT,
  content       TEXT,
  thumbnail_url TEXT,
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  source_type   TEXT NOT NULL DEFAULT 'manual'
                CHECK (source_type IN ('manual','rss','tiktok','facebook')),
  source_url    TEXT,
  source_meta   JSONB,
  tags          TEXT[],
  category      TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','published','archived')),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nn_articles_slug         ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_nn_articles_status       ON articles(status);
CREATE INDEX IF NOT EXISTS idx_nn_articles_source_type  ON articles(source_type);
CREATE INDEX IF NOT EXISTS idx_nn_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_nn_articles_tags         ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_nn_articles_category     ON articles(category);

-- ============================================================
-- 5. LEADS (Popup / Chat / FB Ads / Web Ads)
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  message           TEXT,
  tour_id           UUID REFERENCES tours(id) ON DELETE SET NULL,
  source_page       TEXT,
  lead_source       TEXT
                    CHECK (lead_source IN ('popup','chat','fb_ads','web_ads','organic','other')),
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  image_attachments TEXT[],
  google_drive_url  TEXT,
  status            TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','contacted','consulting','deposited','converted','lost')),
  assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nn_leads_phone       ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_nn_leads_status      ON leads(status);
CREATE INDEX IF NOT EXISTS idx_nn_leads_lead_source ON leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_nn_leads_utm_campaign ON leads(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_nn_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_nn_leads_created_at  ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nn_leads_tour_id     ON leads(tour_id);

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Tours: ai cũng đọc được tour active
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tours_public_read" ON tours;
DROP POLICY IF EXISTS "tours_admin_all"   ON tours;
CREATE POLICY "tours_public_read" ON tours FOR SELECT USING (is_active = TRUE);
CREATE POLICY "tours_admin_all"   ON tours FOR ALL    USING (auth.role() = 'service_role');

-- Tour schedules: ai cũng đọc được lịch open
ALTER TABLE tour_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedules_public_read" ON tour_schedules;
DROP POLICY IF EXISTS "schedules_admin_all"   ON tour_schedules;
CREATE POLICY "schedules_public_read" ON tour_schedules FOR SELECT USING (status = 'open');
CREATE POLICY "schedules_admin_all"   ON tour_schedules FOR ALL    USING (auth.role() = 'service_role');

-- Users: chỉ chủ tài khoản đọc được
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_owner_read"   ON users;
DROP POLICY IF EXISTS "users_owner_update" ON users;
DROP POLICY IF EXISTS "users_admin_all"    ON users;
CREATE POLICY "users_owner_read"   ON users FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "users_owner_update" ON users FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "users_admin_all"    ON users FOR ALL    USING (auth.role() = 'service_role');

-- Wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallets_owner_read" ON wallets;
DROP POLICY IF EXISTS "wallets_admin_all"  ON wallets;
CREATE POLICY "wallets_owner_read" ON wallets FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "wallets_admin_all"  ON wallets FOR ALL USING (auth.role() = 'service_role');

-- Wallet transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_txn_owner_read" ON wallet_transactions;
DROP POLICY IF EXISTS "wallet_txn_admin_all"  ON wallet_transactions;
CREATE POLICY "wallet_txn_owner_read" ON wallet_transactions FOR SELECT
  USING (wallet_id IN (
    SELECT w.id FROM wallets w JOIN users u ON u.id = w.user_id WHERE u.auth_id = auth.uid()
  ));
CREATE POLICY "wallet_txn_admin_all" ON wallet_transactions FOR ALL USING (auth.role() = 'service_role');

-- Bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_owner_read"   ON bookings;
DROP POLICY IF EXISTS "bookings_owner_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_admin_all"    ON bookings;
CREATE POLICY "bookings_owner_read" ON bookings FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "bookings_owner_insert" ON bookings FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "bookings_admin_all" ON bookings FOR ALL USING (auth.role() = 'service_role');

-- Articles: ai cũng đọc được bài published
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "articles_public_read" ON articles;
DROP POLICY IF EXISTS "articles_admin_all"   ON articles;
CREATE POLICY "articles_public_read" ON articles FOR SELECT USING (status = 'published');
CREATE POLICY "articles_admin_all"   ON articles FOR ALL    USING (auth.role() = 'service_role');

-- Leads: ai cũng gửi được (anonymous form), admin quản lý
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_public_insert" ON leads;
DROP POLICY IF EXISTS "leads_admin_all"     ON leads;
CREATE POLICY "leads_public_insert" ON leads FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "leads_admin_all"     ON leads FOR ALL    USING (auth.role() = 'service_role');

-- ============================================================
-- ✅ HOÀN TẤT — Kiểm tra bảng đã tạo:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================
