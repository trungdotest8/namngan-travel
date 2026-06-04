import { z } from 'zod'

export const LeadSourceEnum = z.enum([
  'popup', 'chat', 'fb_ads', 'web_ads', 'organic', 'other',
])

// 6 giá trị gốc + 4 giá trị từ CRM standalone (migration 20250530000003)
export const LeadStatusEnum = z.enum([
  'new', 'contacted', 'consulting', 'deposited', 'converted', 'lost',
  'contact', 'booked', 'done', 'cancel',
])

export const LeadFormSchema = z.object({
  full_name:    z.string().min(2, 'Vui lòng nhập họ tên (ít nhất 2 ký tự)'),
  phone:        z.string().regex(/^(0|\+84)[0-9]{8,10}$/, 'Số điện thoại không hợp lệ'),
  email:        z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  message:      z.string().max(1000).optional(),
  tour_id:      z.string().uuid().optional(),
  lead_source:  LeadSourceEnum,
  pax:          z.number().int().min(1).optional(),
  // UTM tracking — thu thập tự động từ URL params, không do người dùng nhập thủ công
  utm_source:   z.string().max(100).optional(),
  utm_medium:   z.string().max(100).optional(),
  utm_campaign: z.string().max(200).optional(),
  source_page:  z.string().url().optional().or(z.literal('')),
})

// Alias cho code cũ
export const LeadSchema = LeadFormSchema

export type LeadFormInput = z.infer<typeof LeadFormSchema>
export type LeadInput     = LeadFormInput
