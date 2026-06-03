import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/admin-auth-constants'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect /crm (route group (admin) does NOT add to URL)
  const session = req.cookies.get(ADMIN_COOKIE)
  if (!session?.value) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/crm', '/crm/:path*'],
}
