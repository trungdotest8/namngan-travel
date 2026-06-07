import type { NotificationTriggerPayload, NotificationEvent } from '@/types'
import { sendEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram, formatTelegramMessage } from '@/lib/telegram'

// Luồng 3: Email + Realtime + Telegram (Nguyên tắc #7 mở rộng)
export async function triggerNotification(
  payload: NotificationTriggerPayload
): Promise<void> {
  const [emailOk, realtimeOk, telegramOk] = await Promise.allSettled([
    sendEmailNotification(payload),
    broadcastRealtime(payload),
    sendTelegramNotification(payload),
  ])

  if (emailOk.status    === 'rejected') console.error('[Notify] Email thất bại:',    emailOk.reason)
  if (realtimeOk.status === 'rejected') console.error('[Notify] Realtime thất bại:', realtimeOk.reason)
  if (telegramOk.status === 'rejected') console.error('[Notify] Telegram thất bại:', telegramOk.reason)
}

async function sendTelegramNotification(payload: NotificationTriggerPayload) {
  const msg = formatTelegramMessage(payload)
  await sendTelegram(msg)
}

async function sendEmailNotification(payload: NotificationTriggerPayload) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
  if (!adminEmail) {
    console.warn('[Notify] ADMIN_NOTIFY_EMAIL chưa cấu hình — bỏ qua gửi email admin')
    return
  }

  const emailEvents: Partial<Record<NotificationEvent, 'lead-received' | 'booking-confirmation'>> = {
    new_lead:          'lead-received',
    new_booking:       'booking-confirmation',
    booking_confirmed: 'booking-confirmation',
  }

  const template = emailEvents[payload.event]
  if (!template) return // các event khác không gửi email

  await sendEmail({
    template,
    to: adminEmail,
    subject: subjectFor(payload),
    data: {
      customer_name: payload.customer_name ?? 'Khách hàng',
      tour_title:    payload.tour_title,
      depart_date:   payload.depart_date ?? 'Chưa xác định',
      source:        payload.event,
    },
  })

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
      title:      titleFor(payload),
      body:       bodyFor(payload),
      meta: {
        lead_id:          payload.lead_id,
        booking_id:       payload.booking_id,
        destination_name: payload.destination_name,
        article_title:    payload.article_title,
      },
      created_at: new Date().toISOString(),
    },
  })
}

function subjectFor(p: NotificationTriggerPayload): string {
  switch (p.event) {
    case 'new_lead':          return `[Khách hàng mới] ${p.customer_name ?? ''} — Nam Ngân Travel`
    case 'new_booking':
    case 'booking_confirmed': return `[Đặt tour] ${p.tour_title ?? ''} — ${p.customer_name ?? ''}`
    default:                  return 'Thông báo — Nam Ngân Travel'
  }
}

function titleFor(p: NotificationTriggerPayload): string {
  const map: Record<NotificationEvent, string> = {
    new_lead:            'Khách hàng mới',
    new_booking:         'Đặt tour mới',
    booking_confirmed:   'Booking xác nhận',
    lead_status_changed: 'Cập nhật trạng thái lead',
    new_article:         'Bài viết mới',
    new_tour:            'Tour mới',
    tour_updated:        'Cập nhật tour',
    destination_changed: 'Điểm đến thay đổi',
  }
  return map[p.event] ?? p.event
}

function bodyFor(p: NotificationTriggerPayload): string {
  switch (p.event) {
    case 'new_lead':
    case 'new_booking':
    case 'booking_confirmed':
    case 'lead_status_changed': {
      const name = p.customer_name ?? 'Khách hàng'
      const tour = p.tour_title ? ` — ${p.tour_title}` : ''
      return `${name}${tour}`
    }
    case 'new_article':         return p.article_title ?? 'Bài viết mới'
    case 'new_tour':
    case 'tour_updated':        return p.tour_title ?? 'Tour cập nhật'
    case 'destination_changed': return `${p.destination_name ?? 'Điểm đến'} — ${p.detail ?? ''}`
    default:                    return p.detail ?? ''
  }
}
