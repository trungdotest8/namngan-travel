-- ============================================================
-- Migration #19 — Lead Activities (nhật ký chăm sóc)
-- Bảng mới, không sửa bảng cũ (Rule #1: không xóa / ADD only)
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_activities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  staff_name  VARCHAR(100) NOT NULL DEFAULT 'Hệ thống',
  action_type VARCHAR(50) NOT NULL,   -- 'note' | 'call' | 'email' | 'status_change' | 'other'
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nn_lead_activities_lead_id    ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_nn_lead_activities_created_at ON lead_activities(created_at DESC);

-- RLS
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Drop policies nếu tồn tại (idempotent re-run)
DROP POLICY IF EXISTS "lead_activities_admin_all"   ON lead_activities;
DROP POLICY IF EXISTS "lead_activities_anon_insert" ON lead_activities;

-- Admin (service_role) có full quyền
CREATE POLICY "lead_activities_admin_all"
  ON lead_activities FOR ALL
  USING (auth.role() = 'service_role');

-- Anon chỉ được INSERT (hệ thống tự động ghi nhật ký)
CREATE POLICY "lead_activities_anon_insert"
  ON lead_activities FOR INSERT
  WITH CHECK (true);
