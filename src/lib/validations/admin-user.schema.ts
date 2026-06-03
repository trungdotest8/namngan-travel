import { z } from 'zod'

export const CreateAdminUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Chỉ dùng chữ thường, số và dấu _')
    .transform((v) => v.toLowerCase()),
  display_name: z.string().min(1, 'Vui lòng nhập tên hiển thị').max(100),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
  role: z.enum(['admin', 'staff']).default('staff'),
})

export const UpdateAdminUserSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  new_password: z.string().min(6).max(100).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  is_active: z.boolean().optional(),
})

export type CreateAdminUserInput = z.infer<typeof CreateAdminUserSchema>
export type UpdateAdminUserInput = z.infer<typeof UpdateAdminUserSchema>
