-- Migration #22 — Audience Contacts (Custom Audience Ads Data Mining)
-- Lưu SĐT đã chuẩn hóa E.164 (không dấu +) từ nhiều nguồn
-- RLS: chỉ service_role được đọc/ghi — KHÔNG expose ra anon/user

CREATE TABLE IF NOT EXISTS public.audience_contacts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       TEXT        NOT NULL UNIQUE,   -- E.164 no-plus: "84973168492"
    source      TEXT        NOT NULL,          -- 'sms_log'|'lead'|'booking'|'facebook_ads'
    first_seen  TIMESTAMPTZ,
    last_seen   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audience_contacts_source ON public.audience_contacts(source);

ALTER TABLE public.audience_contacts ENABLE ROW LEVEL SECURITY;

-- Chỉ service_role (bypass RLS theo thiết kế Supabase) được thao tác.
-- Không tạo policy nào → anon + authenticated đều bị từ chối.
