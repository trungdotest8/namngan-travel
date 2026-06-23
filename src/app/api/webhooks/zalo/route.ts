import { NextResponse, type NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { triggerNotification } from '@/lib/notifications'
import { sendZaloText, sendZaloWithButtons } from '@/lib/zalo/client'
import { getZaloAccountByOaId, getDefaultZaloAccount } from '@/lib/zalo/multi-account'
import {
  sendTelegramToChatAndGetId,
  formatZaloInboundMessage,
} from '@/lib/telegram-gateway'
import type { ZaloAccount } from '@/types/omnichannel.types'

// Zalo OA webhook: HMAC SHA256 verify với ZALO_OA_SECRET
function verifyZaloSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.ZALO_OA_SECRET
  if (!secret) {
    console.warn('[Zalo Webhook] ZALO_OA_SECRET chưa cấu hình — bỏ qua verify')
    return true
  }
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

const ZaloFormFieldSchema = z.object({
  field_name: z.string(),
  value:      z.string(),
})

const ZaloEventSchema = z.object({
  app_id:         z.string().optional(),
  user_id_by_app: z.string().optional(),
  event_name:     z.string(),
  timestamp:      z.union([z.string(), z.number()]).optional(),
  sender:         z.object({ id: z.string() }).optional(),
  message:        z.object({ msg_id: z.string().optional(), text: z.string().optional() }).optional(),
  info:           z.array(ZaloFormFieldSchema).optional(),
})

type ZaloEvent = z.infer<typeof ZaloEventSchema>

// GET — trả 200 OK (Zalo ping khi setup webhook)
export async function GET() {
  return NextResponse.json({ ok: true })
}

// POST — nhận sự kiện từ Zalo OA
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-zalo-signature') ?? ''

  if (!verifyZaloSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const body = JSON.parse(rawBody)
    const parsed = ZaloEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const event = parsed.data
    const zaloId = event.sender?.id ?? event.user_id_by_app ?? null

    // Xác định tài khoản Zalo nào nhận tin — dùng để routing Telegram
    const zaloAccount = event.app_id
      ? await getZaloAccountByOaId(event.app_id)
      : await getDefaultZaloAccount()

    switch (event.event_name) {
      case 'user_submit_form':
        if (event.info?.length) await handleFormSubmit(event.info, zaloId, zaloAccount)
        break
      case 'user_send_text':
        await handleTextMessage(event, zaloId, zaloAccount)
        break
      case 'follow':
        if (zaloId) await handleFollow(zaloId)
        break
      // unfollow — không cần xử lý
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleFormSubmit(
  info: Array<{ field_name: string; value: string }>,
  zaloId: string | null,
  zaloAccount: ZaloAccount | null,
) {
  const fields = Object.fromEntries(
    info.map(f => [f.field_name.toLowerCase().replace(/\s+/g, '_'), f.value.trim()])
  )

  const phone =
    fields['phone'] ?? fields['phone_number'] ?? fields['sdt'] ??
    fields['so_dien_thoai'] ?? null

  const fullName =
    fields['name'] ?? fields['full_name'] ?? fields['ho_ten'] ??
    fields['ten'] ?? null

  if (!phone) return

  const supabase = createAdminClient()

  const orFilter = zaloId
    ? `zalo_id.eq.${zaloId},phone.eq.${phone}`
    : `phone.eq.${phone}`

  const { data: existing } = await supabase
    .from('leads')
    .select('id, full_name, status')
    .or(orFilter)
    .maybeSingle()

  if (existing) {
    if (zaloId) {
      await supabase.from('leads').update({ zalo_id: zaloId }).eq('id', existing.id)
    }
    await supabase.from('lead_activities').insert({
      lead_id:     existing.id,
      staff_name:  'Hệ thống Zalo',
      action_type: 'note',
      content:     `Khách gửi form qua Zalo OA${fullName ? ` (${fullName})` : ''}`,
    })

    // Ghi conversation_log (inbound)
    if (zaloAccount && zaloId) {
      await logConversation({
        supabase,
        leadId:        existing.id,
        zaloAccountId: zaloAccount.id,
        direction:     'inbound',
        messageText:   `[Form] ${JSON.stringify(fields)}`,
      })
    }

    // Auto-reply: báo đã cập nhật thông tin
    if (zaloId) {
      await sendZaloText(
        zaloId,
        `Xin chào${existing.full_name ? ` ${existing.full_name}` : ''}! ` +
        'Chúng tôi đã cập nhật thông tin của bạn và sẽ liên hệ lại sớm nhất. ' +
        'Cảm ơn bạn đã quan tâm đến Nam Ngân Travel! 🌏'
      )
    }
    return
  }

  // Tạo lead mới
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      full_name:      fullName ?? 'Khách Zalo',
      phone,
      zalo_id:        zaloId,
      lead_source:    'other',
      source_channel: 'zalo',
      status:         'new',
      lead_score:     fullName ? 40 : 20,
    })
    .select()
    .single()

  if (error || !lead) {
    console.error('[Zalo Webhook] Insert lead thất bại:', error)
    return
  }

  await supabase.from('lead_activities').insert({
    lead_id:     lead.id,
    staff_name:  'Hệ thống Zalo',
    action_type: 'note',
    content:     'Lead mới từ form Zalo OA',
  })

  // Ghi conversation_log + auto-create ticket cho lead mới
  if (zaloAccount && zaloId) {
    await logConversation({
      supabase,
      leadId:        lead.id,
      zaloAccountId: zaloAccount.id,
      direction:     'inbound',
      messageText:   `[Form mới] ${JSON.stringify(fields)}`,
    })
    await ensureOpenTicket({ supabase, leadId: lead.id, subject: 'Form Zalo OA mới' })
  }

  // Auto-reply: chào mừng + xác nhận đã nhận
  if (zaloId) {
    await sendZaloText(
      zaloId,
      `Xin chào${fullName ? ` ${fullName}` : ''}! 👋\n` +
      'Cảm ơn bạn đã liên hệ với Nam Ngân Travel. ' +
      'Chúng tôi đã nhận được thông tin và sẽ gọi lại cho bạn trong vòng 30 phút. ' +
      'Trong lúc chờ, bạn có thể xem các tour hấp dẫn tại namngantravel.com 🌏'
    )
  }

  // Luồng kép bắt buộc (Nguyên tắc #7)
  await triggerNotification({
    event:         'new_lead',
    lead_id:       lead.id,
    customer_name: lead.full_name,
  })
}

async function handleTextMessage(
  event: ZaloEvent,
  zaloId: string | null,
  zaloAccount: ZaloAccount | null,
) {
  if (!zaloId) return
  const text = event.message?.text?.trim()
  if (!text) return

  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('id, full_name, status')
    .eq('zalo_id', zaloId)
    .maybeSingle()

  if (lead) {
    // Ghi log tin nhắn vào CRM
    await supabase.from('lead_activities').insert({
      lead_id:     lead.id,
      staff_name:  'Zalo OA',
      action_type: 'note',
      content:     `Tin nhắn Zalo: ${text.slice(0, 500)}`,
    })

    // Gateway: forward tin nhắn lên Telegram với context CRM
    if (zaloAccount) {
      const bookingCtx = await getBookingContext(supabase, lead.id)
      const tgChatId = zaloAccount.telegram_chat_id ?? process.env.TELEGRAM_CHAT_ID ?? null

      if (tgChatId) {
        const tgText = formatZaloInboundMessage({
          accountName:   zaloAccount.account_name,
          customerName:  lead.full_name,
          customerType:  lead.status,
          bookingCode:   bookingCtx?.booking_code ?? null,
          tourName:      bookingCtx?.tour_name ?? null,
          departureDate: bookingCtx?.departure_date ?? null,
          messageText:   text,
        })

        const tgMessageId = await sendTelegramToChatAndGetId(tgChatId, tgText)

        if (tgMessageId) {
          await supabase.from('telegram_zalo_mappings').insert({
            tg_message_id:    tgMessageId,
            zalo_account_id:  zaloAccount.id,
            customer_zalo_id: zaloId,
            lead_id:          lead.id,
          })
        }

        await logConversation({
          supabase,
          leadId:        lead.id,
          zaloAccountId: zaloAccount.id,
          direction:     'inbound',
          messageText:   text,
          tgMessageId:   tgMessageId ?? undefined,
        })
      }

      // Auto-create ticket nếu chưa có ticket open
      await ensureOpenTicket({
        supabase,
        leadId:  lead.id,
        subject: text.slice(0, 100),
      })
    }
  } else {
    // Chưa có lead — hướng dẫn điền form để nhận tư vấn
    await sendZaloWithButtons(
      zaloId,
      'Xin chào! 👋 Bạn đang quan tâm đến tour du lịch nào?\n' +
      'Vui lòng để lại số điện thoại để chúng tôi có thể tư vấn chi tiết cho bạn nhé!',
      [
        { title: '📞 Để lại SĐT', payload: 'leave_phone' },
        { title: '🌏 Xem tour',   payload: 'view_tours'  },
      ]
    )
  }
}

async function handleFollow(zaloId: string) {
  await sendZaloWithButtons(
    zaloId,
    '🎉 Chào mừng bạn đến với Nam Ngân Travel!\n' +
    'Chúng tôi chuyên tour Trung Quốc & Đông Nam Á trọn gói, giá tốt.\n' +
    'Bạn muốn tìm hiểu tour nào?',
    [
      { title: '🇨🇳 Tour Trung Quốc',  payload: 'tour_china'   },
      { title: '🌏 Tour Đông Nam Á',   payload: 'tour_sea'     },
      { title: '💰 Báo giá ngay',      payload: 'get_quote'    },
    ]
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

interface BookingContext {
  booking_code: string
  tour_name: string
  departure_date: string
}

async function getBookingContext(
  supabase: ReturnType<typeof createAdminClient>,
  leadId: string,
): Promise<BookingContext | null> {
  try {
    // Lấy phone của lead → tìm booking của user có phone tương ứng
    const { data: lead } = await supabase
      .from('leads')
      .select('phone')
      .eq('id', leadId)
      .maybeSingle()

    if (!lead?.phone) return null

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone', lead.phone)
      .maybeSingle()

    if (!user?.id) return null

    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        code,
        tour_schedules (
          departure_date,
          tours ( name )
        )
      `)
      .eq('user_id', user.id)
      .not('booking_status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!booking) return null

    const schedule = booking.tour_schedules as unknown as { departure_date: string; tours: { name: string } } | null
    return {
      booking_code:   booking.code,
      tour_name:      schedule?.tours?.name ?? 'Tour',
      departure_date: schedule?.departure_date ?? '',
    }
  } catch {
    return null
  }
}

async function logConversation(opts: {
  supabase: ReturnType<typeof createAdminClient>
  leadId: string
  zaloAccountId: string
  direction: 'inbound' | 'outbound'
  messageText: string
  tgMessageId?: number
  adminUserId?: string
}): Promise<void> {
  await opts.supabase.from('conversation_logs').insert({
    lead_id:         opts.leadId,
    zalo_account_id: opts.zaloAccountId,
    direction:       opts.direction,
    channel:         'zalo',
    message_text:    opts.messageText,
    tg_message_id:   opts.tgMessageId ?? null,
    admin_user_id:   opts.adminUserId ?? null,
  })
}

async function ensureOpenTicket(opts: {
  supabase: ReturnType<typeof createAdminClient>
  leadId: string
  subject?: string
}): Promise<void> {
  const { data: existing } = await opts.supabase
    .from('support_tickets')
    .select('id')
    .eq('lead_id', opts.leadId)
    .in('status', ['open', 'in_progress'])
    .maybeSingle()

  if (!existing) {
    await opts.supabase.from('support_tickets').insert({
      lead_id:  opts.leadId,
      subject:  opts.subject ?? 'Tin nhắn Zalo mới',
      priority: 'normal',
      status:   'open',
    })
  }
}
