import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import type { TourScheduleStatus } from '@/types'

// ── Schema ────────────────────────────────────────────────────────────────────

const NormalizedRowSchema = z.object({
  tourId:         z.number(),
  tourName:       z.string().min(1),
  tourExternalId: z.string(),
  tourSlug:       z.string(),
  country:        z.string().nullable(),
  departureDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priceAdult:     z.number().min(0),
  priceChild:     z.number().min(0),
  seatsTotal:     z.number().min(0),
  transport:      z.string().nullable(),
  externalId:     z.string(),
})

const IngestBodySchema = z.object({
  records: z.array(NormalizedRowSchema).min(1).max(2000),
})

// ── POST /api/departures/ingest ───────────────────────────────────────────────
// Called by scripts/sync-trieuhao.mjs running locally (Vietnamese IP)

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret')
  if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = IngestBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { records } = parsed.data
  const supabase = createAdminClient()
  const errors: string[] = []
  let synced  = 0
  let skipped = 0

  // ── Upsert tours ──────────────────────────────────────────────────────────
  const uniqueTours = [...new Map(records.map(r => [r.tourExternalId, r])).values()]

  for (const r of uniqueTours) {
    try {
      const { data: existing } = await supabase
        .from('tours').select('id').eq('sheets_row_id', r.tourExternalId).maybeSingle()

      if (existing) {
        await supabase.from('tours')
          .update({ synced_at: new Date().toISOString() })
          .eq('id', existing.id)
        continue
      }

      const { data: byName } = await supabase
        .from('tours').select('id').eq('name', r.tourName).maybeSingle()

      if (byName) {
        await supabase.from('tours')
          .update({ sheets_row_id: r.tourExternalId, synced_at: new Date().toISOString(), country: r.country })
          .eq('id', byName.id)
        continue
      }

      await supabase.from('tours').insert({
        code:          `TH-${r.tourId}`,
        name:          r.tourName,
        slug:          `${r.tourSlug}-th-${r.tourId}`,
        destination:   r.tourName,
        category:      'nước ngoài',
        country:       r.country,
        is_active:     true,
        sheets_row_id: r.tourExternalId,
        synced_at:     new Date().toISOString(),
      })
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? String(err)
      errors.push(`tour ${r.tourExternalId}: ${msg}`)
    }
  }

  // ── Rebuild tourId map ────────────────────────────────────────────────────
  const { data: tourRows } = await supabase
    .from('tours').select('id, sheets_row_id').like('sheets_row_id', 'trieuhao:%')

  const tourIdMap = new Map(
    (tourRows ?? [])
      .filter((t): t is { id: string; sheets_row_id: string } => t.sheets_row_id !== null)
      .map(t => [t.sheets_row_id, t.id])
  )

  // ── Upsert schedules ──────────────────────────────────────────────────────
  for (const r of records) {
    const tourId = tourIdMap.get(r.tourExternalId)
    if (!tourId) { skipped++; continue }

    const status: TourScheduleStatus = r.seatsTotal === 0 ? 'full' : 'open'
    const payload = {
      tour_id:        tourId,
      departure_date: r.departureDate,
      return_date:    r.returnDate,
      price_adult:    r.priceAdult,
      price_child:    r.priceChild,
      seats_total:    r.seatsTotal,
      seats_booked:   0,
      transport:      r.transport,
      status,
      sheets_row_id:  r.externalId,
      synced_at:      new Date().toISOString(),
    }

    try {
      const { data: existing } = await supabase
        .from('tour_schedules').select('id').eq('sheets_row_id', r.externalId).maybeSingle()

      if (existing) {
        const { error } = await supabase.from('tour_schedules').update(payload).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tour_schedules').insert(payload)
        if (error) throw error
      }
      synced++
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? String(err)
      errors.push(`schedule ${r.externalId}: ${msg}`)
      skipped++
    }
  }

  // Broadcast realtime
  try {
    await supabase.channel('schedule-sync').send({
      type: 'broadcast', event: 'updated',
      payload: { synced, at: new Date().toISOString() },
    })
  } catch (_) { /* ignore */ }

  return NextResponse.json({ ok: true, synced, skipped, errors })
}
