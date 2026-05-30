import { z } from 'zod'

export const BookingFormSchema = z.object({
  tour_schedule_id: z.string().uuid('ID lịch khởi hành không hợp lệ'),
  adults:           z.number().int().min(1, 'Phải có ít nhất 1 người lớn'),
  children:         z.number().int().min(0).default(0),
  contact_name:     z.string().min(2, 'Vui lòng nhập họ tên'),
  contact_phone:    z.string().regex(/^(0|\+84)[0-9]{8,10}$/, 'Số điện thoại không hợp lệ'),
  contact_email:    z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  special_requests: z.string().max(500).optional(),
  payment_method:   z.enum(['wallet', 'bank_transfer', 'cash', 'online']),
})

export type BookingFormInput = z.infer<typeof BookingFormSchema>
