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

// Escape HTML để ngăn XSS / HTML injection từ dữ liệu người dùng nhập
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── Template renderer ─────────────────────────────────────────────────────────
function renderTemplate(
  templateId: EmailPayload['template'],
  data: Record<string, unknown>
): string {
  const templates: Record<EmailPayload['template'], (d: Record<string, unknown>) => string> = {
    'lead-received': (d) => `
      <h2>Khách hàng mới — Nam Ngân Travel</h2>
      <p><b>Tên:</b> ${esc(d.customer_name)}</p>
      <p><b>Tour quan tâm:</b> ${esc(d.tour_title ?? 'Chưa xác định')}</p>
      <p><b>Nguồn:</b> ${esc(d.source)}</p>
    `,
    'booking-confirmation': (d) => `
      <h2>Xác nhận đặt tour — Nam Ngân Travel</h2>
      <p>Kính gửi ${esc(d.customer_name)},</p>
      <p>Chúng tôi đã nhận được đặt chỗ của bạn cho tour <b>${esc(d.tour_title)}</b>.</p>
      <p><b>Ngày khởi hành:</b> ${esc(d.depart_date)}</p>
      <p>Chúng tôi sẽ liên hệ xác nhận trong vòng 24 giờ.</p>
    `,
    'itinerary-updated': (d) => `
      <h2>Cập nhật lịch trình — ${esc(d.tour_title)}</h2>
      <p>Kính gửi ${esc(d.customer_name)},</p>
      <p>Lịch trình tour của bạn đã được cập nhật. Vui lòng kiểm tra chi tiết mới nhất.</p>
    `,
    'promo-notify': (d) => `
      <h2>Ưu đãi đặc biệt từ Nam Ngân Travel</h2>
      <p>${esc(d.promo_content)}</p>
    `,
    'welcome-lead': (d) => `
      <h2 style="color:#005BAA">Cảm ơn bạn đã liên hệ — Nam Ngân Travel</h2>
      <p>Kính gửi <strong>${esc(d.customer_name)}</strong>,</p>
      <p>Chúng tôi đã nhận được thông tin của bạn${d.destination ? ` về chuyến đi <strong>${esc(d.destination)}</strong>` : ''}.</p>
      <p>Chuyên viên TripGenie sẽ gửi lịch trình cá nhân hóa kèm báo giá chi tiết qua <strong>Zalo</strong> trong vòng <strong>30 phút</strong> (giờ hành chính).</p>
      <p style="margin-top:16px">
        <a href="https://zalo.me/0774623514" style="background:#005BAA;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
          Nhắn Zalo ngay
        </a>
      </p>
      <p style="margin-top:16px;font-size:12px;color:#666">Nam Ngân Travel — namngantravel.com</p>
    `,
  }

  const renderer = templates[templateId]
  return renderer ? renderer(data) : `<p>${esc(JSON.stringify(data))}</p>`
}
