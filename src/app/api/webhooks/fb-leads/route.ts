import { NextResponse, type NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { triggerNotification } from '@/lib/notifications'

// HMAC SHA256 verify với FB_APP_SECRET (optional — nếu không set sẽ skip)
function verifyFbSignature(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.FB_APP_SECRET
  if (!secret) {
    console.warn('[FB Leads] FB_APP_SECRET chưa cấu hình — bỏ qua verify')
    return true
  }
  if (!signatureHeader.startsWith('sha256=')) return false
  const incoming = signatureHeader.slice('sha256='.length)
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(incoming, 'hex'))
  } catch {
    return false
  }
}

// GET — Facebook webhook subscription verification (hub.challenge)
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const mode      = url.searchParams.get('hub.mode')
  const token     = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  const verifyToken = process.env.FB_VERIFY_TOKEN ?? process.env.WEBHOOK_SECRET
  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — nhận sự kiện leadgen từ Facebook Lead Ads
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256') ?? ''

  if (!verifyFbSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Facebook yêu cầu 200 OK nhanh — xử lý không throw ra ngoài
  try {
    const body = JSON.parse(rawBody)
    if (body.object !== 'page') {
      return NextResponse.json({ ok: true })
    }

    const entries: unknown[] = body.entry ?? []
    for (const entry of entries) {
      const changes: unknown[] = (entry as Record<string, unknown[]>).changes ?? []
      for (const change of changes) {
        const c = change as { field: string; value: unknown }
        if (c.field === 'leadgen') {
          await handleLeadgenEvent(c.value as FbLeadgenValue).catch(
            (e: unknown) => console.error('[FB Leads] handleLeadgenEvent thất bại:', e)
          )
        }
      }
    }
  } catch (err) {
    console.error('[FB Leads] Xử lý webhook thất bại:', err)
  }

  return NextResponse.json({ ok: true })
}

interface FbLeadgenValue {
  leadgen_id:  string
  page_id:     string
  form_id:     string
  ad_id?:      string
  campaign_id?: string
}

interface FbFieldData {
  name:   string
  values: string[]
}

async function handleLeadgenEvent(value: FbLeadgenValue) {
  const { leadgen_id, page_id, form_id, ad_id, campaign_id } = value

  const supabase = createAdminClient()

  // Chặn duplicate: fb_lead_id đã tồn tại chưa?
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('fb_lead_id', leadgen_id)
    .maybeSingle()

  if (existing) return

  // Lấy field data từ FB Graph API
  let fullName: string | null = null
  let phone:    string | null = null
  let email:    string | null = null

  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN
  if (accessToken) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${leadgen_id}?fields=field_data&access_token=${accessToken}`,
        { next: { revalidate: 0 } }
      )
      if (res.ok) {
        const data = await res.json() as { field_data?: FbFieldData[] }
        for (const field of data.field_data ?? []) {
          const val  = field.values[0] ?? ''
          const name = field.name.toLowerCase()
          if      (name === 'full_name' || name === 'name')           fullName = val
          else if (name === 'phone_number' || name === 'phone')       phone    = val
          else if (name === 'email')                                  email    = val
        }
      }
    } catch (e) {
      console.error('[FB Leads] Graph API thất bại:', e)
    }
  }

  // Lead score: 40 nếu có phone thật, 10 nếu chỉ có leadgen_id
  const hasRealPhone = phone && !phone.startsWith('FB-')
  const leadScore    = hasRealPhone ? (email ? 60 : 40) : 10

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      full_name:      fullName ?? 'Facebook Lead',
      phone:          phone    ?? `FB-${leadgen_id.slice(-8)}`,
      email:          email    ?? null,
      lead_source:    'fb_ads',
      source_channel: 'facebook',
      status:         'new',
      lead_score:     leadScore,
      fb_lead_id:     leadgen_id,
      fb_page_id:     page_id,
      fb_form_id:     form_id,
      utm_source:     'facebook',
      utm_medium:     'paid',
      utm_campaign:   campaign_id ?? null,
    })
    .select()
    .single()

  if (error || !lead) {
    console.error('[FB Leads] Insert thất bại:', error)
    return
  }

  await supabase.from('lead_activities').insert({
    lead_id:     lead.id,
    staff_name:  'Hệ thống Facebook',
    action_type: 'note',
    content: [
      'Lead từ Facebook Lead Ads',
      `Form: ${form_id}`,
      ad_id       ? `Ad: ${ad_id}`             : null,
      campaign_id ? `Campaign: ${campaign_id}` : null,
    ].filter(Boolean).join(' — '),
  })

  // Luồng kép bắt buộc (Nguyên tắc #7)
  await triggerNotification({
    event:          'new_lead',
    lead_id:        lead.id,
    customer_name:  lead.full_name,
    customer_email: lead.email ?? undefined,
  })
}
