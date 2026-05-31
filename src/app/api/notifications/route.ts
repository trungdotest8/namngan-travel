import { NextResponse } from 'next/server'
import { z } from 'zod'
import { triggerNotification } from '@/lib/notifications'

const NotificationSchema = z.object({
  event:          z.enum(['new_lead', 'new_booking', 'booking_confirmed']),
  lead_id:        z.string().uuid().optional(),
  booking_id:     z.string().optional(),
  customer_name:  z.string().optional(),
  tour_title:     z.string().optional(),
  depart_date:    z.string().optional(),
  customer_email: z.string().email().optional(),
})

// POST /api/notifications — internal only, requires x-webhook-secret header
export async function POST(request: Request) {
  const secret = request.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = NotificationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    await triggerNotification(parsed.data)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
