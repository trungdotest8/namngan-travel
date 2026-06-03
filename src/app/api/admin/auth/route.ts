import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyCredentials, ADMIN_COOKIE } from '@/lib/admin-auth'

const LoginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

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
    const body = await req.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ thông tin' }, { status: 400 })
    }

    const { username, password } = parsed.data
    const user = await verifyCredentials(username, password)

    if (!user) {
      return NextResponse.json(
        { error: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 },
      )
    }

    const res = NextResponse.json({ ok: true, display_name: user.display_name })
    res.cookies.set(ADMIN_COOKIE, user.username, COOKIE_OPTS)
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
