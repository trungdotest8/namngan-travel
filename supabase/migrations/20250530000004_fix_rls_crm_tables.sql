-- Migration #4: Fix RLS — xóa anon SELECT policies nguy hiểm trên CRM tables
-- call_logs và lead_attachments chỉ được đọc bởi service_role (admin)

-- ── call_logs ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "call_logs_anon_select"   ON call_logs;
DROP POLICY IF EXISTS "call_logs_anon_insert"   ON call_logs;

CREATE POLICY "call_logs_admin_all" ON call_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── lead_attachments ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "lead_attachments_anon_select" ON lead_attachments;
DROP POLICY IF EXISTS "lead_attachments_anon_insert" ON lead_attachments;

CREATE POLICY "lead_attachments_admin_all" ON lead_attachments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── webhook_logs ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "webhook_logs_anon_select" ON webhook_logs;

CREATE POLICY "webhook_logs_admin_all" ON webhook_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
