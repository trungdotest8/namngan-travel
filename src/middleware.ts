import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/admin-auth'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect all /admin routes except /admin/login itself
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = req.cookies.get(ADMIN_COOKIE)
    if (session?.value !== '1') {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
