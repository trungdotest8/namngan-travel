import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── Zod schema ────────────────────────────────────────────────

const BodySchema = z.object({
  country:  z.string().min(1).max(100),
  tour_ids: z.array(z.string().uuid()).max(10).default([]),
  style:    z.enum(['seo', 'blog', 'social']),
})

// ── Helpers ───────────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}

function buildPrompt(
  style: 'seo' | 'blog' | 'social',
  country: string,
  tours: Array<{ name: string; duration_days: number | null; price_from: number | null; highlights: string | null; description: string | null }>,
): string {
  const tourList = tours
    .map(
      (t, i) =>
        `${i + 1}. ${t.name}${t.duration_days ? ` (${t.duration_days} ngày)` : ''}${t.price_from ? ` — từ ${t.price_from.toLocaleString('vi-VN')}đ` : ''}\n   ${t.highlights?.slice(0, 150) ?? t.description?.slice(0, 150) ?? ''}`,
    )
    .join('\n')

  const base = `Bạn là copywriter du lịch chuyên nghiệp của Nam Ngân Travel (namngantravel.com).
Viết bài bằng tiếng Việt, giọng văn tự nhiên, đáng tin cậy.

THÔNG TIN TOUR:
${tourList || `Tour du lịch ${country} trọn gói của Nam Ngân Travel.`}

Website đặt tour: namngantravel.com | Hotline/Zalo: 0774 623 514`

  if (style === 'seo') {
    return `${base}

YÊU CẦU: Viết bài SEO chuẩn về du lịch ${country}, khoảng 1200–1500 từ.
Cấu trúc bắt buộc:
- Dòng đầu tiên: # [Tiêu đề hấp dẫn, có từ khóa "du lịch ${country}"]
- ## Tại sao nên đi du lịch ${country}?
- ## Các tour ${country} nổi bật của Nam Ngân Travel (mô tả từng tour ở trên)
- ## Lịch trình gợi ý (dựa trên tour dài nhất)
- ## Kinh nghiệm du lịch ${country} (thời điểm, thời tiết, ẩm thực, lưu ý)
- ## Câu hỏi thường gặp (3–4 câu Q&A)
- ## Đặt tour ngay
Kết thúc bằng CTA: liên hệ namngantravel.com hoặc Zalo 0774 623 514.
Chỉ trả về markdown, không giải thích thêm.`
  }

  if (style === 'blog') {
    return `${base}

YÊU CẦU: Viết bài blog kể chuyện về trải nghiệm du lịch ${country}, khoảng 900–1200 từ.
Cấu trúc bắt buộc:
- Dòng đầu tiên: # [Tiêu đề cảm xúc, ví dụ: "Hành trình ${country} — Điều gì khiến tôi muốn quay lại mãi?"]
- Mở đầu bằng câu chuyện/cảm xúc về ${country}
- Giới thiệu tự nhiên các tour của Nam Ngân Travel
- Chia sẻ tips thực tế (ẩm thực, địa điểm must-see)
- Kết bằng lời kêu gọi nhẹ nhàng: đặt tour qua namngantravel.com
Giọng văn thân thiện, như người bạn kể chuyện.
Chỉ trả về markdown, không giải thích thêm.`
  }

  // social
  return `${base}

YÊU CẦU: Viết caption mạng xã hội về du lịch ${country}, 300–500 từ.
Cấu trúc bắt buộc:
- Dòng đầu tiên: # [Tiêu đề/hook bắt mắt]
- Hook 2–3 dòng gây tò mò
- Liệt kê 3–5 điểm nổi bật bằng emoji ✈️🗼🍜
- Giới thiệu tour với giá từ (nếu có)
- CTA rõ ràng: "Inbox/Zalo 0774 623 514 để được tư vấn miễn phí!"
- Hashtags cuối bài: #dulịch${country.replace(/\s/g, '')} #namngantravel #tourtrọngói
Chỉ trả về markdown, không giải thích thêm.`
}

// ── POST /api/content/generate ────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { country, tour_ids, style } = parsed.data
  const supabase = createAdminClient()

  // Lấy tours — ưu tiên tour_ids cụ thể, fallback theo country
  let tours: Array<{
    name: string
    duration_days: number | null
    price_from: number | null
    highlights: string | null
    description: string | null
  }> = []

  if (tour_ids.length > 0) {
    const { data } = await supabase
      .from('tours')
      .select('name, duration_days, price_from, highlights, description')
      .in('id', tour_ids)
      .eq('is_active', true)
    tours = data ?? []
  } else {
    const { data } = await supabase
      .from('tours')
      .select('name, duration_days, price_from, highlights, description')
      .ilike('country', `%${country}%`)
      .eq('is_active', true)
      .limit(5)
    tours = data ?? []
  }

  // Gọi Claude API
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = buildPrompt(style, country, tours)

  let markdown: string
  try {
    const message = await anthropic.messages.create({
      model:      'claude-opus-4-8',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    })
    markdown = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude API error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Parse title + slug
  const title = extractTitle(markdown) || `Du lịch ${country} trọn gói — Nam Ngân Travel`
  const baseSlug = toSlug(title)
  const slug = `${baseSlug}-${Date.now()}`
  const summary = markdown.replace(/^#+.+$/m, '').replace(/[#*_`]/g, '').trim().slice(0, 300)

  // INSERT vào articles
  const { data: article, error: insertErr } = await supabase
    .from('articles')
    .insert({
      title,
      slug,
      summary,
      content:     markdown,
      source_type: 'manual',
      status:      'draft',
      category:    country,
      tags:        [country, style, 'ai-generated'],
    })
    .select('id, slug')
    .single()

  if (insertErr || !article) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'Không thể lưu bài viết' },
      { status: 500 },
    )
  }

  return NextResponse.json({ article_id: article.id, slug: article.slug }, { status: 201 })
}
