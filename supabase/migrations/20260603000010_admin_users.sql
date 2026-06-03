-- Migration #10: Admin users table for multi-user CRM authentication
-- Separate from public `users` table (customer accounts)

CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL
                  CHECK (username = lower(username) AND length(username) >= 3),
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_users_username  ON admin_users (username);
CREATE INDEX idx_admin_users_is_active ON admin_users (is_active);

-- RLS: service_role only — admin panel always uses createAdminClient()
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_service_role_only"
  ON admin_users FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed: admin / 310191 (bcrypt 12 rounds)
INSERT INTO admin_users (username, password_hash, display_name, role, is_active)
VALUES (
  'admin',
  '$2b$12$i9GriZYXOARKL5CSBsu6AeN9Nw8uAFcGmY2RF.R8830rC.hiE0THq',
  'Admin',
  'admin',
  TRUE
);
