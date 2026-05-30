import type { EmailPayload } from '@/types'
import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY chưa được cấu hình — bỏ qua gửi email')
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false

  try {
    const html = renderTemplate(payload.template, payload.data)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@namngantravel.com',
      to: payload.to,
      subject: payload.subject,
      html,
    })
    return true
  } catch (error) {
    console.error('[Email] Gửi thất bại:', error)
    return false
  }
}

// ── Template renderer ─────────────────────────────────────────────────────────
// Dùng string template thuần, không cần thư viện nặng (MJML, handlebars...)
function renderTemplate(
  templateId: EmailPayload['template'],
  data: Record<string, unknown>
): string {
  const templates: Record<EmailPayload['template'], (d: Record<string, unknown>) => string> = {
    'lead-received': (d) => `
      <h2>Khách hàng mới — Nam Ngân Travel</h2>
      <p><b>Tên:</b> ${d.customer_name}</p>
      <p><b>Tour quan tâm:</b> ${d.tour_title ?? 'Chưa xác định'}</p>
      <p><b>Nguồn:</b> ${d.source}</p>
    `,
    'booking-confirmation': (d) => `
      <h2>Xác nhận đặt tour — Nam Ngân Travel</h2>
      <p>Kính gửi ${d.customer_name},</p>
      <p>Chúng tôi đã nhận được đặt chỗ của bạn cho tour <b>${d.tour_title}</b>.</p>
      <p><b>Ngày khởi hành:</b> ${d.depart_date}</p>
      <p>Chúng tôi sẽ liên hệ xác nhận trong vòng 24 giờ.</p>
    `,
    'itinerary-updated': (d) => `
      <h2>Cập nhật lịch trình — ${d.tour_title}</h2>
      <p>Kính gửi ${d.customer_name},</p>
      <p>Lịch trình tour của bạn đã được cập nhật. Vui lòng kiểm tra chi tiết mới nhất.</p>
    `,
    'promo-notify': (d) => `
      <h2>Ưu đãi đặc biệt từ Nam Ngân Travel</h2>
      <p>${d.promo_content}</p>
    `,
  }

  const renderer = templates[templateId]
  return renderer ? renderer(data) : `<p>${JSON.stringify(data)}</p>`
}
