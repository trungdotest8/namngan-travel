// Bảng: tour_pdf_index
// Crawler: crawlAndIndexTourPDF.js (Node.js backend, chạy như Cron job)
// RLS: public SELECT, service_role INSERT/UPDATE

export interface TourPdfIndex {
  id:                string          // UUID
  tour_code:         string | null   // liên kết mềm với tours.code
  tour_name:         string
  original_url:      string          // URL gốc PDF từ đối tác (UNIQUE)
  crawled_at:        string          // ISO 8601 UTC
  google_drive_id:   string | null   // Drive fileId — dùng để build preview URL
  google_drive_link: string | null   // webViewLink — dùng làm src của <iframe>
  pdf_title:         string | null   // dòng tiêu đề đầu tiên trong PDF
  summary:           string | null   // 300 ký tự đầu của extracted_text
  extracted_text:    string | null   // toàn bộ text thô (full-text search qua GIN index)
  created_at:        string
  updated_at:        string
}

// Response khi Child A tìm kiếm PDF content
export interface PdfSearchResult {
  tour_code:         string | null
  tour_name:         string
  google_drive_link: string | null
  pdf_title:         string | null
  summary:           string | null
  crawled_at:        string
  rank:              number          // ts_rank từ PostgreSQL FTS
}

// Response của /api/itinerary/[tourId] — dùng bởi Child C
export interface ItineraryResponse {
  tour_id:       string
  tour_code:     string
  tour_name:     string
  destination:   string | null
  duration_days: number | null
  thumbnail_url: string | null
  includes:      string[] | null
  excludes:      string[] | null
  // Lịch trình cấu trúc từ tours.itinerary (JSONB)
  structured: import('./tour.types').TourItineraryDay[] | null
  // PDF từ tour_pdf_index (ưu tiên bản mới nhất)
  pdf: {
    drive_link:  string           // dùng làm iframe src
    drive_id:    string           // dùng build embed URL thay thế
    title:       string | null
    summary:     string | null
    crawled_at:  string
  } | null
}
