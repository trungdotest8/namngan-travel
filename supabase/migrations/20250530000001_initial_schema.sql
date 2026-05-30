-- ============================================================
-- NAM NGÂN TRAVEL — DATABASE SCHEMA v1.0.0
-- PostgreSQL / Supabase compatible
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TOURS & TOUR_SCHEDULES
-- ============================================================

CREATE TABLE tours (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT UNIQUE NOT NULL,                  -- mã tour, e.g. "NN-HN-001"
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  destination   TEXT,
  duration_days SMALLINT,
  description   TEXT,
  highlights    TEXT,
  itinerary     JSONB,                                 -- lịch trình chi tiết theo ngày
  includes      TEXT[],                                -- dịch vụ bao gồm
  excludes      TEXT[],                                -- dịch vụ không bao gồm
  thumbnail_url TEXT,
  gallery_urls  TEXT[],
  category      TEXT,                                  -- e.g. "trong nước", "nước ngoài"
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sheets_row_id TEXT,                                  -- row ID đồng bộ từ Google Sheets
  synced_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tour_schedules (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id        UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  return_date    DATE NOT NULL,
  price_adult    NUMERIC(12,0) NOT NULL,
  price_child    NUMERIC(12,0) NOT NULL DEFAULT 0,
  seats_total    SMALLINT NOT NULL,
  seats_booked   SMALLINT NOT NULL DEFAULT 0,
  meeting_point  TEXT,
  transport      TEXT,                                 -- e.g. "máy bay", "xe limousine"
  status         TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','full','cancelled','completed')),
  sheets_row_id  TEXT,
  synced_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_nn_seats CHECK (seats_booked <= seats_total),
  CONSTRAINT chk_nn_dates CHECK (return_date >= departure_date)
);

CREATE INDEX idx_nn_tour_schedules_tour_id        ON tour_schedules(tour_id);
CREATE INDEX idx_nn_tour_schedules_departure_date ON tour_schedules(departure_date);
CREATE INDEX idx_nn_tour_schedules_status         ON tour_schedules(status);
CREATE INDEX idx_nn_tours_slug                    ON tours(slug);
CREATE INDEX idx_nn_tours_category                ON tours(category);
CREATE INDEX idx_nn_tours_is_active               ON tours(is_active);

-- ============================================================
-- 2. USERS, WALLETS & WALLET_TRANSACTIONS
-- ============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id       UUID UNIQUE,                           -- Supabase auth.users.id
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

CREATE TABLE wallets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance    NUMERIC(14,0) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id      UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  booking_id     UUID,                                 -- FK bổ sung sau khi tạo bookings
  type           TEXT NOT NULL
                 CHECK (type IN ('deposit','withdrawal','refund','payment','bonus')),
  amount         NUMERIC(14,0) NOT NULL,               -- luôn dương; chiều xác định bởi type
  balance_before NUMERIC(14,0) NOT NULL,
  balance_after  NUMERIC(14,0) NOT NULL,
  note           TEXT,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nn_users_phone                    ON users(phone);
CREATE INDEX idx_nn_users_email                    ON users(email);
CREATE INDEX idx_nn_users_auth_id                  ON users(auth_id);
CREATE INDEX idx_nn_wallet_txn_wallet_id           ON wallet_transactions(wallet_id);
CREATE INDEX idx_nn_wallet_txn_booking_id          ON wallet_transactions(booking_id);
CREATE INDEX idx_nn_wallet_txn_type                ON wallet_transactions(type);
CREATE INDEX idx_nn_wallet_txn_created_at          ON wallet_transactions(created_at DESC);

-- ============================================================
-- 3. BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT UNIQUE NOT NULL,               -- mã đặt chỗ, e.g. "NN-20250001"
  user_id          UUID NOT NULL REFERENCES users(id),
  tour_schedule_id UUID NOT NULL REFERENCES tour_schedules(id),
  adults           SMALLINT NOT NULL DEFAULT 1 CHECK (adults >= 1),
  children         SMALLINT NOT NULL DEFAULT 0 CHECK (children >= 0),
  price_adult      NUMERIC(12,0) NOT NULL,             -- snapshot giá lúc đặt
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

ALTER TABLE wallet_transactions
  ADD CONSTRAINT fk_nn_wallet_txn_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

CREATE INDEX idx_nn_bookings_user_id          ON bookings(user_id);
CREATE INDEX idx_nn_bookings_tour_schedule_id ON bookings(tour_schedule_id);
CREATE INDEX idx_nn_bookings_booking_status   ON bookings(booking_status);
CREATE INDEX idx_nn_bookings_payment_status   ON bookings(payment_status);
CREATE INDEX idx_nn_bookings_created_at       ON bookings(created_at DESC);
CREATE INDEX idx_nn_bookings_code             ON bookings(code);

-- ============================================================
-- 4. ARTICLES (CMS + RSS / TikTok crawler)
-- ============================================================

CREATE TABLE articles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  summary       TEXT,
  content       TEXT,
  thumbnail_url TEXT,
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  source_type   TEXT NOT NULL DEFAULT 'manual'
                CHECK (source_type IN ('manual','rss','tiktok','facebook')),
  source_url    TEXT,                                  -- URL gốc nếu cào từ feed
  source_meta   JSONB,                                 -- metadata thô từ nguồn cào
  tags          TEXT[],
  category      TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','published','archived')),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nn_articles_slug         ON articles(slug);
CREATE INDEX idx_nn_articles_status       ON articles(status);
CREATE INDEX idx_nn_articles_source_type  ON articles(source_type);
CREATE INDEX idx_nn_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_nn_articles_tags         ON articles USING GIN(tags);
CREATE INDEX idx_nn_articles_category     ON articles(category);

-- ============================================================
-- 5. LEADS (Popup / Form Chat / FB Ads / Web Ads)
-- ============================================================

CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  message           TEXT,
  tour_id           UUID REFERENCES tours(id) ON DELETE SET NULL,
  source_page       TEXT,                              -- URL trang khi submit
  lead_source       TEXT
                    CHECK (lead_source IN ('popup','chat','fb_ads','web_ads','organic','other')),
  utm_source        TEXT,                              -- e.g. "facebook", "google"
  utm_medium        TEXT,                              -- e.g. "cpc", "banner"
  utm_campaign      TEXT,                              -- tên chiến dịch quảng cáo
  image_attachments TEXT[],                            -- mảng link ảnh hồ sơ khách tải lên
  google_drive_url  TEXT,                              -- link thư mục Drive riêng của khách
  status            TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','contacted','consulting','deposited','converted','lost')),
  assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nn_leads_phone          ON leads(phone);
CREATE INDEX idx_nn_leads_status         ON leads(status);
CREATE INDEX idx_nn_leads_lead_source    ON leads(lead_source);
CREATE INDEX idx_nn_leads_utm_campaign   ON leads(utm_campaign);
CREATE INDEX idx_nn_leads_assigned_to    ON leads(assigned_to);
CREATE INDEX idx_nn_leads_created_at     ON leads(created_at DESC);
CREATE INDEX idx_nn_leads_tour_id        ON leads(tour_id);
