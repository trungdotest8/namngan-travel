// Telegram Webhook — Flow B: Staff reply trên Telegram → forward sang Zalo
// Setup: đăng ký webhook tại https://api.telegram.org/bot{TOKEN}/setWebhook
//        url=https://namngantravel.com/api/webhooks/telegram
//        secret_token={TELEGRAM_WEBHOOK_SECRET}

import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendZaloTextWithToken } from '@/lib/zalo/multi-account'
import { sendTelegramReplyToChat } from '@/lib/telegram-gateway'

// GET — ping verification (không cần thiết với Telegram nhưng để /health check)
export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  // Verify Telegram secret token (tuỳ chọn nhưng nên bật trên production)
  const tgSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (tgSecret) {
    const incoming = request.headers.get('x-telegram-bot-api-secret-token')
    if (incoming !== tgSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: TelegramUpdate
  try {
    body = await request.json() as TelegramUpdate
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const msg = body.message ?? body.edited_message
  if (!msg) return NextResponse.json({ ok: true })

  // Chỉ xử lý reply — tin nhắn thường bỏ qua
  if (!msg.reply_to_message) return NextResponse.json({ ok: true })

  const replyToId = msg.reply_to_message.message_id
  const staffChatId = String(msg.chat.id)
  const staffText = msg.text?.trim()

  if (!staffText) return NextResponse.json({ ok: true })

  const supabase = createAdminClient()

  // Tra cứu mapping Telegram message_id → Zalo account + customer
  const { data: mapping } = await supabase
    .from('telegram_zalo_mappings')
    .select('id, customer_zalo_id, zalo_account_id, lead_id')
    .eq('tg_message_id', replyToId)
    .maybeSingle()

  if (!mapping) {
    await sendTelegramReplyToChat(
      staffChatId,
      '⚠️ Không tìm thấy mapping. Tin nhắn gốc này không đến từ Zalo hoặc đã hết hạn.',
      msg.message_id,
    )
    return NextResponse.json({ ok: true })
  }

  // Lấy access_token của ZaloAccount tương ứng
  const { data: zaloAccount } = await supabase
    .from('zalo_accounts')
    .select('id, account_name, access_token')
    .eq('id', mapping.zalo_account_id)
    .maybeSingle()

  if (!zaloAccount?.access_token) {
    await sendTelegramReplyToChat(
      staffChatId,
      `⚠️ Tài khoản Zalo "${zaloAccount?.account_name ?? 'unknown'}" chưa cấu hình access_token.`,
      msg.message_id,
    )
    return NextResponse.json({ ok: true })
  }

  // Gửi tin nhắn qua Zalo với đúng token của OA tương ứng
  const result = await sendZaloTextWithToken(
    mapping.customer_zalo_id,
    staffText,
    zaloAccount.access_token,
  )

  if (result.error !== 0) {
    await sendTelegramReplyToChat(
      staffChatId,
      `❌ Gửi Zalo thất bại (${result.message}). Vui lòng thử lại hoặc liên hệ khách qua số điện thoại.`,
      msg.message_id,
    )
    return NextResponse.json({ ok: true })
  }

  // Lấy admin_user_id từ telegram_chat_id (nếu staff đã cấu hình)
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, display_name')
    .eq('telegram_chat_id', staffChatId)
    .maybeSingle()

  // Ghi conversation_log (outbound)
  await supabase.from('conversation_logs').insert({
    lead_id:         mapping.lead_id,
    zalo_account_id: mapping.zalo_account_id,
    direction:       'outbound',
    channel:         'zalo',
    message_text:    staffText,
    tg_message_id:   msg.message_id,
    admin_user_id:   adminUser?.id ?? null,
  })

  // Cập nhật support_ticket: đánh dấu đã phản hồi lần đầu
  if (mapping.lead_id) {
    await supabase
      .from('support_tickets')
      .update({
        first_response_at: new Date().toISOString(),
        status:            'in_progress',
      })
      .eq('lead_id', mapping.lead_id)
      .in('status', ['open'])
      .is('first_response_at', null)

    // Cập nhật leads.updated_at
    await supabase
      .from('leads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', mapping.lead_id)
  }

  return NextResponse.json({ ok: true })
}

// ── Telegram Update types (subset) ────────────────────────────────────────────

interface TelegramUser {
  id: number
  username?: string
  first_name?: string
}

interface TelegramChat {
  id: number
  type: string
}

interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  text?: string
  reply_to_message?: { message_id: number }
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
}
