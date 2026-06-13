export interface Tour {
  id:            string
  code:          string           // "NN-HN-001"
  name:          string
  slug:          string
  destination:   string | null
  duration_days: number | null
  description:   string | null
  highlights:    string | null
  itinerary:     TourItineraryDay[] | null   // JSONB
  includes:      string[] | null
  excludes:      string[] | null
  thumbnail_url: string | null
  gallery_urls:  string[] | null
  hashtags:      string[]         // SEO/social hashtags, e.g. ["#dulichtrongnuoc"]
  category:      string | null    // "trong nước" | "nước ngoài"
  country:       string | null    // e.g. "NHẬT BẢN", "HÀN QUỐC", "VIỆT NAM"
  is_active:     boolean
  sheets_row_id: string | null
  synced_at:     string | null    // ISO 8601
  created_at:    string
  updated_at:    string
  // Detail columns — migration #24 (null cho đến khi import-tours-from-sheet.ts chạy)
  summary:          string | null
  inclusions:       string[] | null  // JSONB — khác với includes TEXT[]
  exclusions:       string[] | null  // JSONB — khác với excludes TEXT[]
  policies:         string | null
  pdf_url:          string | null
  detail_synced_at: string | null
  // Gallery — migration #26 (null cho đến khi admin upload qua TourGalleryManager)
  images:           string[] | null   // JSONB — upload thủ công, ảnh[0] = đại diện
}

export interface TourItineraryDay {
  day:         number
  title:       string
  description: string
  meals?:      string[]           // ["Sáng", "Trưa", "Tối"]
}

export interface TourSchedule {
  id:             string
  tour_id:        string
  departure_date: string          // "YYYY-MM-DD"
  return_date:    string          // "YYYY-MM-DD"
  price_adult:    number          // VND
  price_child:    number          // VND
  seats_total:    number
  seats_booked:   number
  flight_code_departure: string | null   // e.g. "VN-141"
  flight_code_return:    string | null   // e.g. "VN-142"
  meeting_point:  string | null
  transport:      string | null   // "máy bay" | "xe limousine"
  status:         TourScheduleStatus
  sheets_row_id:  string | null
  synced_at:      string | null
  created_at:     string
  updated_at:     string
  // Join
  tour?:          Tour
}

export type TourScheduleStatus = 'open' | 'full' | 'cancelled' | 'completed'

export type TourSearchResult = Tour & {
  min_price: number
  schedules: TourSchedule[]
}
