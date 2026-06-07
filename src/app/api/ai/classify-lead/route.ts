import { NextResponse } from 'next/server'
import { z } from 'zod'
import { classifyLead } from '@/lib/ai/classify'
import { createAdminClient } from '@/lib/supabase/admin'

const BodySchema = z.object({
  lead_id: z.string().uuid(),
})

// POST /api/ai/classify-lead
// Gọi sau khi tạo lead — cập nhật ai_tier + ai_tags vào DB
// Internal route: chỉ gọi server-side (không cần auth vì không expose data nhạy cảm)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'lead_id không hợp lệ' }, { status: 400 })
  }

  const { lead_id } = parsed.data
  const supabase    = createAdminClient()

  // Lấy lead data để classify
  const { data: lead, error: fetchErr } = await supabase
    .from('leads')
    .select('lead_score, destination_interest, budget_range, travel_date, number_of_people, travel_style, message, lead_source, source_channel')
    .eq('id', lead_id)
    .single()

  if (fetchErr || !lead) {
    return NextResponse.json({ error: 'Lead không tìm thấy' }, { status: 404 })
  }

  const result = await classifyLead({
    lead_score:           lead.lead_score           ?? 0,
    destination_interest: lead.destination_interest ?? null,
    budget_range:         lead.budget_range         ?? null,
    travel_date:          lead.travel_date          ?? null,
    number_of_people:     lead.number_of_people     ?? null,
    travel_style:         lead.travel_style         ?? null,
    message:              lead.message              ?? null,
    lead_source:          lead.lead_source          ?? null,
    source_channel:       lead.source_channel       ?? null,
  })

  const { error: updateErr } = await supabase
    .from('leads')
    .update({ ai_tier: result.tier, ai_tags: result.ai_tags })
    .eq('id', lead_id)

  if (updateErr) {
    console.error('[Classify] DB update thất bại:', updateErr.message)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ tier: result.tier, ai_tags: result.ai_tags })
}
