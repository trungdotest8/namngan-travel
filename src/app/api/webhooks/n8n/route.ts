import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { LeadFormSchema } from '@/lib/validations/lead.schema'
import { triggerNotification } from '@/lib/notifications'

const N8nPayloadSchema = z.object({
  event: z.string(),
  data:  z.record(z.unknown()),
})

// POST /api/webhooks/n8n
// Nhận sự kiện từ n8n: new_lead_notify | sync_departures | publish_news
// Bảo mật: x-webhook-secret header phải khớp WEBHOOK_SECRET
export async function POST(request: Request) {
  const incomingSecret = request.headers.get('x-webhook-secret')
  if (!incomingSecret || incomingSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = N8nPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { event, data } = parsed.data

    if (event === 'new_lead_notify') {
      // Lead từ Zalo/Facebook qua n8n → tạo bản ghi leads
      const leadParsed = LeadFormSchema.safeParse(data)
      if (!leadParsed.success) {
        return NextResponse.json({ error: leadParsed.error.flatten() }, { status: 400 })
      }

      const supabase = createAdminClient()
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({ ...leadParsed.data, status: 'new' })
        .select()
        .single()

      if (error) throw error

      // Luồng kép bắt buộc (Nguyên tắc #7)
      await triggerNotification({
        event:          'new_lead',
        lead_id:        lead.id,
        customer_name:  lead.full_name,
        customer_email: lead.email ?? undefined,
      })
    }

    // sync_departures và publish_news được n8n tự xử lý trigger qua route riêng
    // Thêm event handler tại đây khi cần

    return NextResponse.json({ ok: true, event })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
