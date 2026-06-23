-- Migration #29: Omnichannel Gateway + CRM Integration
-- Thêm 4 bảng mới (không đụng chạm bảng cũ) + mở rộng admin_users

-- Sequence cho ticket_code auto-numbering
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

-- 1. Quản lý nhiều tài khoản Zalo OA
CREATE TABLE IF NOT EXISTS zalo_accounts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oa_id            TEXT UNIQUE,           -- app_id trong Zalo webhook event
  phone_number     VARCHAR(20) UNIQUE NOT NULL,
  account_name     VARCHAR(100) NOT NULL,
  department       VARCHAR(50) CHECK (department IN ('sales','support','booking')),
  access_token     TEXT,
  refresh_token    TEXT,
  telegram_chat_id TEXT,                  -- Nhóm Telegram nhận tin của tài khoản này
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zalo_accounts_oa_id ON zalo_accounts(oa_id);

-- 2. Mapping Telegram message_id → Zalo customer (dùng để staff reply)
CREATE TABLE IF NOT EXISTS telegram_zalo_mappings (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tg_message_id      BIGINT UNIQUE NOT NULL,
  zalo_account_id    UUID NOT NULL REFERENCES zalo_accounts(id) ON DELETE CASCADE,
  customer_zalo_id   VARCHAR(100) NOT NULL,
  lead_id            UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tg_zalo_mappings_tg_msg ON telegram_zalo_mappings(tg_message_id);
CREATE INDEX IF NOT EXISTS idx_tg_zalo_mappings_lead   ON telegram_zalo_mappings(lead_id);

-- 3. Lịch sử hội thoại omnichannel (inbound + outbound)
CREATE TABLE IF NOT EXISTS conversation_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id           UUID REFERENCES leads(id) ON DELETE SET NULL,
  zalo_account_id   UUID REFERENCES zalo_accounts(id) ON DELETE SET NULL,
  direction         VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
  channel           VARCHAR(20) DEFAULT 'zalo' CHECK (channel IN ('zalo','telegram','facebook')),
  message_text      TEXT,
  tg_message_id     BIGINT,
  admin_user_id     UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  sent_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conv_logs_lead    ON conversation_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_conv_logs_sent_at ON conversation_logs(sent_at DESC);

-- 4. Support tickets (tự động tạo khi có tin nhắn mới từ khách)
CREATE TABLE IF NOT EXISTS support_tickets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_code       TEXT UNIQUE NOT NULL DEFAULT
    'TKT-' || to_char(NOW(),'YYYY') || '-' || LPAD(nextval('ticket_seq')::TEXT, 4, '0'),
  lead_id           UUID REFERENCES leads(id) ON DELETE SET NULL,
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  subject           VARCHAR(200),
  priority          VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status            VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  first_response_at TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_lead   ON support_tickets(lead_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- 5. Mở rộng admin_users: thêm telegram_chat_id + department
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS department VARCHAR(50)
    CHECK (department IN ('sales','support','booking'));
