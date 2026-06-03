import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, ADMIN_COOKIE } from '@/lib/admin-auth'

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24h
  secure: process.env.NODE_ENV === 'production',
}

// POST /api/admin/auth — login
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json() as { password?: string }
    if (!password || !verifyPassword(password)) {
      return NextResponse.json({ error: 'Sai mật khẩu' }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true })
    res.cookies.set(ADMIN_COOKIE, '1', COOKIE_OPTS)
    return res
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

// DELETE /api/admin/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 })
  return res
}
