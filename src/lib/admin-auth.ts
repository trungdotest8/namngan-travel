import bcrypt from 'bcryptjs'
import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminUser, AdminUserRow } from '@/types/admin.types'

import { ADMIN_COOKIE } from '@/lib/admin-auth-constants'
export { ADMIN_COOKIE }

// Used by webhook/customer-profile routes (WEBHOOK_SECRET header)
export function checkAdminSecret(request: Request): NextResponse | null {
  const incoming = request.headers.get('x-admin-secret')
  const expected = process.env.WEBHOOK_SECRET
  if (!expected || !incoming || incoming !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// Used by CRM-facing routes: accepts cookie (browser) OR WEBHOOK_SECRET header (programmatic)
// Kept synchronous — all existing callers remain unchanged
export function isAdminRequest(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET ?? ''
  if (secret && req.headers.get('x-admin-secret') === secret) return true
  return !!req.cookies.get(ADMIN_COOKIE)?.value
}

// Verify username + password against admin_users table
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<AdminUser | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username.toLowerCase())
      .eq('is_active', true)
      .single<AdminUserRow>()

    if (error || !data) return null

    const valid = await bcrypt.compare(password, data.password_hash)
    if (!valid) return null

    const { password_hash: _omit, ...safeUser } = data
    return safeUser as AdminUser
  } catch {
    return null
  }
}

// Fetch currently logged-in admin from cookie username (httpOnly → server only)
export async function getCurrentAdminUser(
  req: NextRequest,
): Promise<AdminUser | null> {
  const username = req.cookies.get(ADMIN_COOKIE)?.value
  if (!username) return null

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, username, display_name, role, is_active, created_at, updated_at')
      .eq('username', username)
      .eq('is_active', true)
      .single<AdminUser>()

    if (error || !data) return null
    return data
  } catch {
    return null
  }
}
