import { NextResponse } from 'next/server'
import { z } from 'zod'
import { syncModaBooking } from '@/lib/integrations/moda'
import { triggerNotification } from '@/lib/notifications'

const ModaCallbackSchema = z.object({
  booking_id:   z.string(),
  tour_slug:    z.string(),
  depart_date:  z.string(),
  customer: z.object({
    name:  z.string(),
    phone: z.string(),
    email: z.string(),
  }),
  total_amount: z.number(),
  status:       z.enum(['pending', 'confirmed', 'cancelled']),
})

// POST /api/webhooks/moda
// Nhận callback từ Moda khi booking thay đổi trạng thái
// Bảo mật: x-webhook-secret header phải khớp WEBHOOK_SECRET
export async function POST(request: Request) {
  const incomingSecret = request.headers.get('x-webhook-secret')
  if (!incomingSecret || incomingSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = ModaCallbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const payload = parsed.data

    const result = await syncModaBooking(payload)
    if (!result.success) {
      return NextResponse.json({ error: 'Moda sync failed' }, { status: 502 })
    }

    // Luồng kép khi booking được xác nhận (Nguyên tắc #7)
    if (payload.status === 'confirmed') {
      await triggerNotification({
        event:          'booking_confirmed',
        booking_id:     payload.booking_id,
        customer_name:  payload.customer.name,
        customer_email: payload.customer.email,
      })
    }

    return NextResponse.json({ ok: true, status: payload.status })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
