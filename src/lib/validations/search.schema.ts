import { z } from 'zod'

// v2.1.0 — meetingPoint và departureDate optional, destination là bắt buộc duy nhất
export const SearchCriteriaSchema = z.object({
  category:      z.string().optional(),
  destination:   z.string().min(1, 'Vui lòng chọn điểm đến'),
  tourName:      z.string().optional(),
  meetingPoint:  z.string().optional(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ').optional(),
  adults:        z.number().int().min(1, 'Phải có ít nhất 1 người lớn'),
  children:      z.number().int().min(0),
})

export type SearchCriteriaInput = z.infer<typeof SearchCriteriaSchema>
