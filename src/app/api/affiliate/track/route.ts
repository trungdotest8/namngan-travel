import { type NextRequest, NextResponse } from 'next/server'
import { getLinkById, recordClick } from '@/lib/affiliate/tracker'

// GET /api/affiliate/track?link_id=<uuid>&lead_id=<uuid>&session_id=<str>
// Records a click then 302-redirects to the affiliate tracking_url
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const link_id    = searchParams.get('link_id')
    const lead_id    = searchParams.get('lead_id')
    const session_id = searchParams.get('session_id')

    if (!link_id) {
      return NextResponse.json({ error: 'link_id required' }, { status: 400 })
    }

    const link = await getLinkById(link_id)
    if (!link) {
      return NextResponse.json({ error: 'link not found' }, { status: 404 })
    }

    // Record click fire-and-forget — không block redirect
    recordClick({
      link_id,
      lead_id:    lead_id    || null,
      session_id: session_id || null,
      ip:         req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      referrer:   req.headers.get('referer') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
    }).catch(() => { /* silent — không fail redirect */ })

    return NextResponse.redirect(link.tracking_url, { status: 302 })
  } catch (err) {
    console.error('[affiliate/track]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
