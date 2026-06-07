import { z } from 'zod'

// Khớp enum lead_source_channel trong migration #16
export const LeadSourceChannelEnum = z.enum([
  'web_form', 'chatbot', 'zalo', 'facebook', 'tiktok', 'organic', 'other',
])

export const LeadStatusEnum = z.enum([
  'new', 'contacted', 'consulting', 'deposited', 'converted', 'lost',
])

// Schema đầy đủ cho TripGenie lead capture (thêm các trường từ migration #16)
// website_hp là honeypot ẩn — nếu bot điền vào sẽ bị chặn
export const LeadCaptureSchema = z.object({
  // Bắt buộc
  full_name:            z.string().min(2, 'Vui lòng nhập họ tên (ít nhất 2 ký tự)').max(100),
  phone:                z.string().regex(/^(0|\+84)[0-9]{8,10}$/, 'Số điện thoại không hợp lệ'),

  // Liên hệ bổ sung
  email:                z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  zalo_id:              z.string().max(100).optional().or(z.literal('')),

  // Nhu cầu chuyến đi
  destination_interest: z.string().max(255).optional().or(z.literal('')),
  travel_date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD').optional().or(z.literal('')),
  budget_range:         z.string().max(100).optional().or(z.literal('')),
  number_of_people:     z.number().int().min(1).max(99).optional(),
  travel_style:         z.string().max(100).optional().or(z.literal('')),
  message:              z.string().max(1000).optional().or(z.literal('')),

  // Source tracking (giữ cả hai để backward-compat với chat widget cũ)
  source_channel:       LeadSourceChannelEnum.optional(),
  lead_source:          z.string().max(50).optional(),
  tour_id:              z.string().uuid().optional(),
  source_page:          z.string().url().optional().or(z.literal('')),
  utm_source:           z.string().max(100).optional(),
  utm_medium:           z.string().max(100).optional(),
  utm_campaign:         z.string().max(200).optional(),

  // Honeypot — phải để trống; nếu có giá trị là bot
  website_hp:           z.string().nullable().optional(),
})

export const LeadStatusUpdateSchema = z.object({
  lead_status: LeadStatusEnum,
  lead_score:  z.number().int().min(0).max(100).optional(),
})

export type LeadCaptureInput     = z.infer<typeof LeadCaptureSchema>
export type LeadStatusUpdateInput = z.infer<typeof LeadStatusUpdateSchema>

// Tính lead_score tự động: +20 mỗi field ngoài required (full_name, phone)
export function calcLeadScore(data: LeadCaptureInput): number {
  const extras: Array<unknown> = [
    data.email,
    data.zalo_id,
    data.destination_interest,
    data.travel_date,
    data.budget_range,
    data.number_of_people && data.number_of_people > 1 ? data.number_of_people : null,
    data.travel_style,
    data.message,
  ]
  const filled = extras.filter(v => v !== null && v !== undefined && v !== '').length
  return Math.min(filled * 20, 100)
}
