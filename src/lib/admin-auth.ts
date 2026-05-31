import { NextResponse } from 'next/server'

export function checkAdminSecret(request: Request): NextResponse | null {
  const incoming = request.headers.get('x-admin-secret')
  const expected = process.env.WEBHOOK_SECRET
  if (!expected || !incoming || incoming !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export function adminFetchHeaders(): Record<string, string> {
  return { 'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '' }
}
