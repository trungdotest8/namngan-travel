import type { NotificationTriggerPayload } from '@/types'
import { sendEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'

// Luồng kép bắt buộc: Email + Realtime (Nguyên tắc #7)
export async function triggerNotification(
  payload: NotificationTriggerPayload
): Promise<void> {
  const [emailOk, realtimeOk] = await Promise.allSettled([
    sendEmailNotification(payload),
    broadcastRealtime(payload),
  ])

  if (emailOk.status === 'rejected')
    console.error('[Notify] Email thất bại:', emailOk.reason)
  if (realtimeOk.status === 'rejected')
    console.error('[Notify] Realtime thất bại:', realtimeOk.reason)
}

async function sendEmailNotification(payload: NotificationTriggerPayload) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
  if (!adminEmail) {
    console.warn('[Notify] ADMIN_NOTIFY_EMAIL chưa cấu hình — bỏ qua gửi email admin')
    return
  }

  const templates = {
    new_lead:          'lead-received',
    new_booking:       'booking-confirmation',
    booking_confirmed: 'booking-confirmation',
  } as const

  await sendEmail({
    template: templates[payload.event],
    to: adminEmail,
    subject: subjectFor(payload),
    data: {
      customer_name: payload.customer_name ?? 'Khách hàng',
      tour_title:    payload.tour_title,
      depart_date:   payload.depart_date ?? 'Chưa xác định',
      source:        payload.event,
    },
  })

  // Gửi thêm email cho khách nếu có địa chỉ
  if (payload.customer_email && payload.event !== 'new_lead') {
    await sendEmail({
      template: 'booking-confirmation',
      to: payload.customer_email,
      subject: `Xác nhận đặt tour — ${payload.tour_title ?? 'Nam Ngân Travel'}`,
      data: {
        customer_name: payload.customer_name ?? 'Quý khách',
        tour_title:    payload.tour_title,
        depart_date:   payload.depart_date ?? 'Chưa xác định',
      },
    })
  }
}

async function broadcastRealtime(payload: NotificationTriggerPayload) {
  const supabase = createAdminClient()
  await supabase.channel('admin-notifications').send({
    type:    'broadcast',
    event:   payload.event,
    payload: {
      title:       titleFor(payload),
      body:        bodyFor(payload),
      lead_id:     payload.lead_id,
      booking_id:  payload.booking_id,
      created_at:  new Date().toISOString(),
    },
  })
}

function subjectFor(p: NotificationTriggerPayload): string {
  if (p.event === 'new_lead')
    return `[Khách hàng mới] ${p.customer_name ?? ''} — Nam Ngân Travel`
  if (p.event === 'new_booking' || p.event === 'booking_confirmed')
    return `[Đặt tour] ${p.tour_title ?? ''} — ${p.customer_name ?? ''}`
  return 'Thông báo — Nam Ngân Travel'
}

function titleFor(p: NotificationTriggerPayload): string {
  if (p.event === 'new_lead')    return 'Khách hàng mới'
  if (p.event === 'new_booking') return 'Đặt tour mới'
  return 'Booking xác nhận'
}

function bodyFor(p: NotificationTriggerPayload): string {
  const name = p.customer_name ?? 'Khách hàng'
  const tour = p.tour_title ? ` — Tour: ${p.tour_title}` : ''
  return `${name}${tour}`
}
