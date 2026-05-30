// Alias để giữ backward-compat với code cũ dùng Departure
// Bảng thực tế là tour_schedules — dùng TourSchedule từ tour.types.ts
export type { TourSchedule as Departure } from './tour.types'
