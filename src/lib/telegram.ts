import type { NotificationTriggerPayload } from '@/types'

const TELEGRAM_API = 'https://api.telegram.org'

/**
 * Gửi tin nhắn đến Telegram bot.
 * Cần TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID trong .env.
 */
export async function sendTelegram(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return // biến chưa cấu hình → bỏ qua

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    chatId,
      text,
      parse_mode: 'HTML',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram API error: ${err}`)
  }
}

const EVENT_EMOJI: Record<string, string> = {
  new_lead:            '👤',
  new_booking:         '🎫',
  booking_confirmed:   '✅',
  lead_status_changed: '🔄',
  new_article:         '📝',
  new_tour:            '✈️',
  tour_updated:        '✏️',
  destination_changed: '📍',
}

/**
 * Format payload thành tin nhắn Telegram HTML.
 */
export function formatTelegramMessage(payload: NotificationTriggerPayload): string {
  const icon = EVENT_EMOJI[payload.event] ?? '🔔'
  const site = 'namngantravel.com'
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

  const lines: string[] = [
    `${icon} <b>Nam Ngân Travel</b> — ${time}`,
    '',
  ]

  switch (payload.event) {
    case 'new_lead':
      lines.push(`<b>👤 Khách hàng mới</b>`)
      lines.push(`Tên: ${payload.customer_name ?? 'Chưa có'}`)
      if (payload.detail) lines.push(`SĐT: ${payload.detail}`)
      lines.push(`→ Xem CRM: https://${site}/crm`)
      break

    case 'new_booking':
    case 'booking_confirmed':
      lines.push(`<b>🎫 Đặt tour ${payload.event === 'booking_confirmed' ? '(đã xác nhận)' : 'mới'}</b>`)
      lines.push(`Khách: ${payload.customer_name ?? 'Chưa có'}`)
      if (payload.tour_title)  lines.push(`Tour: ${payload.tour_title}`)
      if (payload.depart_date) lines.push(`Ngày: ${payload.depart_date}`)
      lines.push(`→ Xem CRM: https://${site}/crm`)
      break

    case 'lead_status_changed':
      lines.push(`<b>🔄 Cập nhật lead</b>`)
      lines.push(`Khách: ${payload.customer_name ?? 'Chưa có'}`)
      if (payload.detail) lines.push(`Trạng thái: ${payload.detail}`)
      lines.push(`→ Xem CRM: https://${site}/crm`)
      break

    case 'new_article':
      lines.push(`<b>📝 Bài viết mới đã đăng</b>`)
      if (payload.article_title) lines.push(`Tiêu đề: ${payload.article_title}`)
      lines.push(`→ Xem blog: https://${site}/blog`)
      break

    case 'new_tour':
    case 'tour_updated':
      lines.push(`<b>${payload.event === 'new_tour' ? '✈️ Tour mới' : '✏️ Tour cập nhật'}</b>`)
      if (payload.tour_title) lines.push(`Tour: ${payload.tour_title}`)
      lines.push(`→ Xem CRM: https://${site}/crm`)
      break

    case 'destination_changed':
      lines.push(`<b>📍 Điểm đến nổi bật thay đổi</b>`)
      if (payload.destination_name) lines.push(`Điểm đến: ${payload.destination_name}`)
      if (payload.detail) lines.push(`Hành động: ${payload.detail}`)
      lines.push(`→ Xem CRM: https://${site}/crm`)
      break

    default:
      lines.push(`<b>🔔 ${payload.event}</b>`)
      if (payload.detail) lines.push(payload.detail)
  }

  return lines.join('\n')
}
