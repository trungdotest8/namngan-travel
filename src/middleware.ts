import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/admin-auth-constants'

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''

  // Redirect namngantravel.site → namngantravel.com (301 permanent)
  if (hostname === 'namngantravel.site' || hostname === 'www.namngantravel.site') {
    const url = req.nextUrl.clone()
    url.host = 'namngantravel.com'
    url.port = ''
    return NextResponse.redirect(url, { status: 301 })
  }

  const { pathname } = req.nextUrl

  // Protect /crm (route group (admin) does NOT add to URL)
  if (pathname.startsWith('/crm')) {
    const session = req.cookies.get(ADMIN_COOKIE)
    if (!session?.value) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, images, fonts
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
