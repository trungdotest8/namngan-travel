-- =============================================================
-- Migration #6: tour_pdf_index
-- Bảng lưu index PDF lịch trình đã crawl từ đối tác
-- Crawler: crawlAndIndexTourPDF.js (Node.js, chạy ngoài Next.js)
-- =============================================================

CREATE TABLE IF NOT EXISTS tour_pdf_index (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Thông tin tour (liên kết mềm — không FK cứng vì data crawl từ ngoài về)
  tour_code         TEXT,                               -- liên kết với tours.code
  tour_name         TEXT NOT NULL,

  -- Nguồn gốc file
  original_url      TEXT UNIQUE NOT NULL,               -- URL gốc — dùng để check trùng
  crawled_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Google Drive
  google_drive_id   TEXT UNIQUE,                        -- Drive fileId
  google_drive_link TEXT,                               -- webViewLink (dùng để embed <iframe>)

  -- Nội dung bóc tách từ PDF
  pdf_title         TEXT,                               -- dòng tiêu đề đầu tiên
  summary           TEXT,                               -- 300 ký tự đầu
  extracted_text    TEXT,                               -- toàn bộ text thô (full-text search)

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index tìm kiếm nhanh theo URL (check trùng lặp)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_index_original_url
  ON tour_pdf_index(original_url);

-- Index full-text search nội dung PDF — dùng GIN để @@ to_tsquery nhanh
CREATE INDEX IF NOT EXISTS idx_pdf_index_extracted_text
  ON tour_pdf_index
  USING GIN (to_tsvector('simple', coalesce(extracted_text, '')));

-- Index liên kết với bảng tours
CREATE INDEX IF NOT EXISTS idx_pdf_index_tour_code
  ON tour_pdf_index(tour_code);

-- Index sắp xếp theo thời gian crawl (lấy bản mới nhất)
CREATE INDEX IF NOT EXISTS idx_pdf_index_crawled_at
  ON tour_pdf_index(crawled_at DESC);

-- Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_pdf_index_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pdf_index_updated_at
  BEFORE UPDATE ON tour_pdf_index
  FOR EACH ROW EXECUTE FUNCTION update_pdf_index_updated_at();

-- ── RLS Policies ──────────────────────────────────────────────────────────
ALTER TABLE tour_pdf_index ENABLE ROW LEVEL SECURITY;

-- Public đọc được (khách hàng tìm kiếm nội dung PDF)
CREATE POLICY "public_read_pdf_index"
  ON tour_pdf_index FOR SELECT
  USING (true);

-- Chỉ service role được ghi (crawler dùng SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "service_role_write_pdf_index"
  ON tour_pdf_index FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_update_pdf_index"
  ON tour_pdf_index FOR UPDATE
  USING (auth.role() = 'service_role');
