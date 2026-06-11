-- Migration #24 — Tour Detail Columns
-- Thêm cột chi tiết cho bảng tours (dữ liệu từ Google Sheets "tours_master" đã duyệt tay).
-- An toàn: ADD COLUMN IF NOT EXISTS — không xóa, không đổi kiểu cột hiện có.
--
-- LƯU Ý về các cột đã tồn tại trong initial_schema.sql:
--   • slug     TEXT UNIQUE NOT NULL  → ADD COLUMN IF NOT EXISTS là no-op
--   • highlights TEXT                → no-op; kiểu TEXT giữ nguyên (không đổi sang jsonb)
--     Script import sẽ ghi string[] → PostgREST tự serialize thành JSON string trong cột TEXT.
--   • itinerary JSONB               → no-op (cùng kiểu)
--
-- CÁC CỘT MỚI THỰC SỰ ĐƯỢC THÊM:
--   summary, inclusions, exclusions, policies, pdf_url, detail_synced_at

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS slug             text UNIQUE,
  ADD COLUMN IF NOT EXISTS summary          text,
  ADD COLUMN IF NOT EXISTS highlights       jsonb,
  ADD COLUMN IF NOT EXISTS itinerary        jsonb,
  ADD COLUMN IF NOT EXISTS inclusions       jsonb,
  ADD COLUMN IF NOT EXISTS exclusions       jsonb,
  ADD COLUMN IF NOT EXISTS policies         text,
  ADD COLUMN IF NOT EXISTS pdf_url          text,
  ADD COLUMN IF NOT EXISTS detail_synced_at timestamptz;

-- Index trên slug — idx_nn_tours_slug đã tồn tại từ initial_schema.sql → IF NOT EXISTS = no-op
CREATE INDEX IF NOT EXISTS idx_nn_tours_slug
  ON public.tours (slug);

-- Index hỗ trợ query "chưa sync detail" hoặc "sync lần đầu"
CREATE INDEX IF NOT EXISTS idx_tours_detail_synced_at
  ON public.tours (detail_synced_at)
  WHERE detail_synced_at IS NULL;
