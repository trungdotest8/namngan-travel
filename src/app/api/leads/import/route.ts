import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

const ImportRowSchema = z.object({
  full_name:            z.string().min(1).max(200),
  phone:                z.string().min(5).max(20),
  email:                z.string().email().optional().nullable().or(z.literal('')),
  lead_source:          z.enum(['popup','chat','fb_ads','web_ads','organic','other']).optional(),
  status:               z.enum(['new','contacted','consulting','deposited','converted','lost','contact','booked','done','cancel']).optional(),
  destination_interest: z.string().max(255).optional().nullable(),
  note:                 z.string().max(1000).optional().nullable(),
})

const ImportBodySchema = z.object({
  rows: z.array(ImportRowSchema).min(1).max(500),
})

// POST /api/leads/import — bulk insert leads (max 500/request)
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = ImportBodySchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const now = new Date().toISOString()
    const rows = parsed.data.rows.map((r) => ({
      full_name:            r.full_name.trim(),
      phone:                r.phone.trim(),
      email:                r.email || null,
      lead_source:          r.lead_source ?? 'organic',
      status:               r.status ?? 'converted',
      destination_interest: r.destination_interest ?? null,
      note:                 r.note ?? null,
      source_channel:       'other' as const,
      lead_score:           20,
      created_at:           now,
      updated_at:           now,
    }))

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('leads')
      .insert(rows)
      .select('id')

    if (error) throw error

    return NextResponse.json({ inserted: data?.length ?? 0 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
