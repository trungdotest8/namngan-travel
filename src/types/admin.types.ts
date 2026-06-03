export type AdminRole = 'admin' | 'staff'

export interface AdminUser {
  id: string
  username: string
  display_name: string
  role: AdminRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// Server-only — never send to client
export interface AdminUserRow extends AdminUser {
  password_hash: string
}
