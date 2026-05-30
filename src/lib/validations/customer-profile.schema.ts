import { z } from 'zod'

const DRIVE_REGEX = /^https:\/\/(drive|docs)\.google\.com\//

export const CustomerProfileSchema = z.object({
  full_name:        z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  phone:            z.string().regex(/^(0|\+84)[0-9]{8,10}$/, 'Số điện thoại không hợp lệ'),
  email:            z.string().email().optional().or(z.literal('')),
  google_drive_url: z
    .string()
    .regex(DRIVE_REGEX, 'Phải là link Google Drive hoặc Google Docs hợp lệ')
    .optional()
    .or(z.literal('')),
  note: z.string().max(500).optional(),
})

export const ImageAttachmentUploadSchema = z.object({
  file_size: z.number().max(10 * 1024 * 1024, 'File tối đa 10MB'),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], {
    errorMap: () => ({ message: 'Chỉ chấp nhận JPG, PNG, WebP hoặc PDF' }),
  }),
})

// Alias cũ
export const AvatarUploadSchema = z.object({
  file_size: z.number().max(5 * 1024 * 1024, 'File tối đa 5MB'),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Chỉ chấp nhận file JPG, PNG hoặc WebP' }),
  }),
})

export type CustomerProfileInput = z.infer<typeof CustomerProfileSchema>
