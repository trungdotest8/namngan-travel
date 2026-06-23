// Telegram Gateway — các hàm gửi tin và lấy message_id để làm mapping
// Tách khỏi telegram.ts (notification-only) để không ảnh hưởng luồng hiện tại

const TELEGRAM_API = 'https://api.telegram.org'

interface TelegramSendResult {
  ok: boolean
  result?: { message_id: number }
}

// Gửi tin nhắn đến một chatId cụ thể và trả về message_id
// Dùng khi cần lưu telegram_zalo_mappings (Flow A: Zalo → Telegram)
export async function sendTelegramToChatAndGetId(
  chatId: string,
  text: string,
): Promise<number | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('[Telegram Gateway] TELEGRAM_BOT_TOKEN chưa cấu hình')
    return null
  }

  try {
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
      console.error('[Telegram Gateway] sendMessage thất bại:', await res.text())
      return null
    }

    const data: TelegramSendResult = await res.json()
    return data.result?.message_id ?? null
  } catch (err) {
    console.error('[Telegram Gateway] Lỗi khi gửi tin:', err)
    return null
  }
}

// Gửi tin nhắn reply tới một chatId cụ thể (dùng để báo lỗi cho staff)
export async function sendTelegramReplyToChat(
  chatId: string,
  text: string,
  replyToMessageId?: number,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  try {
    await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:             chatId,
        text,
        parse_mode:          'HTML',
        reply_to_message_id: replyToMessageId,
      }),
    })
  } catch (err) {
    console.error('[Telegram Gateway] sendTelegramReplyToChat thất bại:', err)
  }
}

// Format tin nhắn Zalo → Telegram với context CRM
export function formatZaloInboundMessage(opts: {
  accountName:   string
  customerName:  string | null
  customerType:  string | null
  bookingCode:   string | null
  tourName:      string | null
  departureDate: string | null
  messageText:   string
}): string {
  const { accountName, customerName, customerType, bookingCode, tourName, departureDate, messageText } = opts

  const typeEmoji: Record<string, string> = {
    new:        '🆕',
    contacted:  '📞',
    consulting: '💬',
    deposited:  '💰',
    converted:  '✅',
    lost:       '❌',
  }
  const statusIcon = (customerType && typeEmoji[customerType]) ?? '👤'

  const lines: string[] = [
    `<b>[${accountName}]</b> ${statusIcon} <b>${customerName ?? 'Khách chưa đặt tên'}</b>`,
  ]

  if (bookingCode && tourName) {
    lines.push(`📋 Booking: <b>${bookingCode}</b> | ${tourName}`)
  }
  if (departureDate) {
    lines.push(`🗓️ Khởi hành: ${departureDate}`)
  }

  lines.push(`💬 "${messageText}"`)

  return lines.join('\n')
}
