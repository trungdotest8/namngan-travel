import { z } from 'zod'

// v2.0.0 — field names khớp với DB schema
export const SearchCriteriaSchema = z.object({
  category:      z.string().optional(),                                         // tours.category (auto-derived)
  destination:   z.string().min(1, 'Vui lòng chọn điểm đến'),                  // tours.destination
  tourName:      z.string().optional(),                                         // tours.name
  meetingPoint:  z.string().min(1, 'Vui lòng chọn nơi xuất phát'),             // tour_schedules.meeting_point
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'), // tour_schedules.departure_date
  adults:        z.number().int().min(1, 'Phải có ít nhất 1 người lớn'),        // bookings.adults
  children:      z.number().int().min(0),                                       // bookings.children
})

export type SearchCriteriaInput = z.infer<typeof SearchCriteriaSchema>
