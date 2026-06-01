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
  category:      string | null    // "trong nước" | "nước ngoài"
  country:       string | null    // e.g. "NHẬT BẢN", "HÀN QUỐC", "VIỆT NAM"
  is_active:     boolean
  sheets_row_id: string | null
  synced_at:     string | null    // ISO 8601
  created_at:    string
  updated_at:    string
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
