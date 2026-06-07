import { NextResponse, type NextRequest } from 'next/server'
import { LeadCaptureSchema, calcLeadScore } from '@/lib/validations/lead-capture.schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { triggerNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'
import { ADMIN_COOKIE } from '@/lib/admin-auth-constants'

function isAuthed(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
  if (secret && secret === process.env.WEBHOOK_SECRET) return true
  return !!req.cookies.get(ADMIN_COOKIE)?.value
}

// GET /api/leads?channel=web_form&status=new&page=1&limit=20
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const channel = searchParams.get('channel')
  const status  = searchParams.get('status')
  const page    = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const offset  = (page - 1) * limit

  const supabase = createAdminClient()
  // eslint-disable-next-line prefer-const
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (channel) query = query.eq('source_channel', channel)
  if (status)  query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ leads: data ?? [], total: count ?? 0, page, limit })
}

// POST /api/leads
// Nguyên tắc #7: Email + Realtime + Telegram đồng thời
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Honeypot — bot điền vào → trả 200 giả để không lộ detection
    if (body.website_hp) return NextResponse.json({ ok: true }, { status: 200 })

    const parsed = LeadCaptureSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const d           = parsed.data
    const lead_score  = calcLeadScore(d)

    const supabase = createAdminClient()
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        full_name:            d.full_name,
        phone:                d.phone,
        email:                d.email            || null,
        zalo_id:              d.zalo_id          || null,
        destination_interest: d.destination_interest || null,
        travel_date:          d.travel_date      || null,
        budget_range:         d.budget_range     || null,
        number_of_people:     d.number_of_people ?? 1,
        travel_style:         d.travel_style     || null,
        message:              d.message          || null,
        source_channel:       d.source_channel   ?? 'web_form',
        lead_source:          d.lead_source       ?? 'organic',
        tour_id:              d.tour_id           ?? null,
        source_page:          d.source_page       || null,
        utm_source:           d.utm_source        || null,
        utm_medium:           d.utm_medium        || null,
        utm_campaign:         d.utm_campaign      || null,
        lead_score,
        status: 'new',
      })
      .select()
      .single()

    if (error) throw error

    // Luồng 3: Admin — Email + Realtime + Telegram
    triggerNotification({
      event:          'new_lead',
      lead_id:        lead.id,
      customer_name:  lead.full_name,
      customer_email: lead.email ?? undefined,
      detail:         lead.phone,
    }).catch((e) => console.error('[Notify] new_lead thất bại:', e))

    // AI Classification — fire-and-forget (không block response)
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/ai/classify-lead`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lead_id: lead.id }),
    }).catch((e) => console.error('[Classify] trigger thất bại:', e))

    // Welcome email gửi cho khách (fire-and-forget)
    if (lead.email) {
      sendEmail({
        template: 'welcome-lead',
        to:       lead.email,
        subject:  'Cảm ơn bạn đã liên hệ — Nam Ngân Travel',
        data: {
          customer_name: lead.full_name,
          destination:   lead.destination_interest ?? undefined,
        },
      }).catch((e) => console.error('[Email] welcome-lead thất bại:', e))
    }

    return NextResponse.json({ lead }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
