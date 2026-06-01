-- =============================================================
-- Migration #7: search_pdf_index RPC
-- PostgreSQL FTS function thay thế ILIKE fallback trong /api/pdf-index
-- Trả kết quả sắp xếp theo ts_rank (GIN index trên extracted_text)
-- =============================================================

CREATE OR REPLACE FUNCTION search_pdf_index(
  search_query  TEXT,
  result_limit  INT  DEFAULT 10,
  filter_code   TEXT DEFAULT NULL
)
RETURNS TABLE (
  tour_code         TEXT,
  tour_name         TEXT,
  google_drive_link TEXT,
  pdf_title         TEXT,
  summary           TEXT,
  crawled_at        TIMESTAMPTZ,
  rank              REAL
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.tour_code,
    t.tour_name,
    t.google_drive_link,
    t.pdf_title,
    t.summary,
    t.crawled_at,
    ts_rank(
      to_tsvector('simple', coalesce(t.extracted_text, '')),
      plainto_tsquery('simple', search_query)
    ) AS rank
  FROM tour_pdf_index t
  WHERE
    to_tsvector('simple', coalesce(t.extracted_text, ''))
      @@ plainto_tsquery('simple', search_query)
    AND t.google_drive_link IS NOT NULL
    AND (filter_code IS NULL OR t.tour_code = filter_code)
  ORDER BY rank DESC
  LIMIT result_limit;
$$;

-- Anon và authenticated role đều được gọi (public search)
GRANT EXECUTE ON FUNCTION search_pdf_index(TEXT, INT, TEXT) TO anon, authenticated;
