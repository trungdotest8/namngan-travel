export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { getActiveLinks } from '@/lib/affiliate/tracker'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ItineraryRequestSchema = z.object({
  destination: z.string().min(2).max(100),
  days:        z.coerce.number().int().min(1).max(30),
  budget:      z.string().max(100).optional(),
  travelers:   z.coerce.number().int().min(1).max(50).default(2),
  preferences: z.string().max(500).optional(),
})

function buildSystemPrompt(affiliateSections: string): string {
  return `Bạn là TripGenie — AI du lịch của Nam Ngân Travel (namngantravel.com). Tạo lịch trình du lịch chi tiết, thực tế, hữu ích bằng tiếng Việt.

FORMAT BẮT BUỘC (Markdown):
## Ngày X: [Tên hoạt động chính]
**Buổi sáng:**
- Hoạt động / điểm tham quan
- Gợi ý ăn sáng

**Buổi chiều:**
- Hoạt động / điểm tham quan
- Gợi ý ăn trưa

**Buổi tối:**
- Hoạt động / điểm tham quan
- Gợi ý ăn tối / ẩm thực đặc trưng

**Chi phí ước tính ngày ${'{X}'}:** khoảng X.XXX.000 – X.XXX.000đ/người

[Lặp lại cho từng ngày]

## Tổng chi phí ước tính: X – X triệu/người (chưa bao gồm vé máy bay)

## Lưu ý quan trọng:
- Thủ tục visa, đặc điểm khí hậu, trang phục
- Gợi ý đặt tour trọn gói từ Nam Ngân Travel (Zalo: 0774 623 514) để được hỗ trợ tốt nhất${affiliateSections}

NGUYÊN TẮC:
- Viết bằng tiếng Việt, thực tế, cụ thể (tên địa điểm thực, nhà hàng thực)
- Giá ước tính bằng VND, phù hợp với ngân sách khách
- Đề xuất 1-2 nhà hàng/quán ăn địa phương mỗi ngày
- Chỉ nhúng link đối tác khi thực sự liên quan trực tiếp (đặt khách sạn, tour địa phương...)
- Không bịa thông tin — nếu không chắc, ghi "tham khảo thêm tại địa phương"`
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI chưa được cấu hình. Vui lòng thêm ANTHROPIC_API_KEY.' },
      { status: 503 },
    )
  }

  let parsed: z.SafeParseReturnType<typeof ItineraryRequestSchema._type, typeof ItineraryRequestSchema._output>
  try {
    const body = await req.json()
    parsed = ItineraryRequestSchema.safeParse(body)
  } catch {
    return NextResponse.json({ error: 'Request body không hợp lệ.' }, { status: 400 })
  }

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { destination, days, budget, travelers, preferences } = parsed.data

  // Fetch affiliate links — ưu tiên theo điểm đến, fallback tất cả
  let affiliateLinks = await getActiveLinks({ destination }).catch(() => [])
  if (affiliateLinks.length === 0) {
    affiliateLinks = await getActiveLinks().catch(() => [])
  }

  const affiliateSections =
    affiliateLinks.length > 0
      ? `\n\nLINK ĐỐI TÁC SẴN CÓ — nhúng tự nhiên khi liên quan:\n${affiliateLinks
          .map(l => `- ${l.label}: ${l.tracking_url}`)
          .join('\n')}`
      : ''

  const systemPrompt = buildSystemPrompt(affiliateSections)

  const userContent = [
    `Tạo lịch trình ${days} ngày tại ${destination} cho ${travelers} người.`,
    budget      ? `Ngân sách: ${budget}.`               : '',
    preferences ? `Sở thích / yêu cầu: ${preferences}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Gửi affiliate links trước để client render ngay sau khi done
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ affiliate_links: affiliateLinks })}\n\n`),
      )

      // 2. Stream nội dung lịch trình từ Claude
      try {
        const claudeStream = anthropic.messages.stream({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system:     systemPrompt,
          messages:   [{ role: 'user', content: userContent }],
        })

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`),
            )
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        )
      }

      // 3. Done
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection:      'keep-alive',
    },
  })
}
