import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdminUser } from '@/lib/admin-auth'

// GET /api/admin/me — trả thông tin admin đang đăng nhập (từ httpOnly cookie)
export async function GET(req: NextRequest) {
  const user = await getCurrentAdminUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return NextResponse.json({ user })
}
