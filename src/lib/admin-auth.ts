import { NextRequest, NextResponse } from 'next/server'

export const ADMIN_COOKIE = 'admin_session'

// Used by webhook/customer-profile routes (WEBHOOK_SECRET)
export function checkAdminSecret(request: Request): NextResponse | null {
  const incoming = request.headers.get('x-admin-secret')
  const expected = process.env.WEBHOOK_SECRET
  if (!expected || !incoming || incoming !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// Used by CRM-facing routes: accepts cookie (browser) OR header (programmatic)
export function isAdminRequest(req: NextRequest): boolean {
  const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''
  if (!secret) return false
  if (req.headers.get('x-admin-secret') === secret) return true
  return req.cookies.get(ADMIN_COOKIE)?.value === '1'
}

// Used by /api/admin/auth login endpoint
export function verifyPassword(password: string): boolean {
  const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''
  return !!secret && password === secret
}
