import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { isAdminRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PromoFeature } from '@/types/landing-page';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BodySchema = z.object({
  fb_text:  z.string().min(10, 'fb_text quá ngắn'),
  tour_id:  z.string().uuid('tour_id phải là UUID hợp lệ'),
  slug:     z.string().min(3).max(80).regex(/^[a-z0-9-]+$/, 'slug chỉ dùng chữ thường, số và dấu -'),
});

const AI_PROMPT = (fbText: string) => `Bạn là chuyên gia marketing du lịch Việt Nam.
Bóc tách đoạn text Facebook Ads sau thành JSON THUẦN TÚY (không markdown, không backtick):

TEXT:
${fbText}

Trả về ĐÚNG cấu trúc:
{
  "headline": "tiêu đề giật tít ngắn gọn thu hút",
  "sub_headline": "2-3 câu khơi gợi nhu cầu, kết thúc dấu chấm",
  "price_deal": 29990000,
  "departure_note": "Khởi hành ngày DD/MM/YYYY",
  "promo_features": [
    { "icon": "Plane", "title": "Tiêu đề", "description": "Mô tả ngắn" }
  ]
}

Quy tắc: price_deal là số nguyên VND hoặc null. promo_features tối đa 6 items.
Icon phải là một trong: Plane, Star, Shield, Clock, MapPin, Gift, Camera, Heart, Award, Zap.
Nếu thiếu thông tin để null — KHÔNG bịa.`;

interface AiExtracted {
  headline?: string;
  sub_headline?: string | null;
  price_deal?: number | null;
  departure_note?: string | null;
  promo_features?: PromoFeature[];
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await req.json() as unknown;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const { fb_text, tour_id, slug } = parsed.data;

    // ── Gọi AI bóc tách ─────────────────────────────────────────────
    const aiRes = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: AI_PROMPT(fb_text) }],
    });

    const rawText = aiRes.content[0]?.type === 'text' ? aiRes.content[0].text.trim() : '';

    let extracted: AiExtracted = {};
    try {
      extracted = JSON.parse(rawText) as AiExtracted;
    } catch {
      return NextResponse.json({ error: 'AI không trả về JSON hợp lệ. Thử lại hoặc kiểm tra nội dung.' }, { status: 422 });
    }

    if (!extracted.headline) {
      return NextResponse.json({ error: 'AI không bóc tách được headline từ nội dung này.' }, { status: 422 });
    }

    // ── Upsert vào DB ────────────────────────────────────────────────
    const supabase = createAdminClient();
    const { error: dbErr } = await supabase
      .from('tour_landing_pages')
      .upsert({
        slug,
        tour_id,
        headline:       extracted.headline,
        sub_headline:   extracted.sub_headline   ?? null,
        price_deal:     extracted.price_deal      ?? null,
        departure_note: extracted.departure_note  ?? null,
        promo_features: extracted.promo_features  ?? [],
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'slug' });

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, slug });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[LandingPageGenerate_Crash]', err);
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}
