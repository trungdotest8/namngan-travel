import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { syncSeaStarSchedules } from '@/lib/integrations/seastar'

// ── Zod schemas ────────────────────────────────────────────────────────────────

const GetQuerySchema = z.object({
  destination: z.string().optional(),
  month:       z.string().regex(/^\d{4}-\d{2}$/).optional(),
  status:      z.enum(['open', 'full', 'cancelled', 'completed']).optional(),
  limit:       z.coerce.number().int().min(1).max(200).default(50),
  tour_id:     z.string().uuid().optional(),
})

const SyncTriggerSchema = z.object({
  force: z.boolean().default(false),
})

// ── GET /api/departures ────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = GetQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { destination, month, status, limit, tour_id } = parsed.data
    const supabase = await createClient()

    let query = supabase
      .from('tour_schedules')
      .select('*, tour:tours(id, code, name, slug, destination, category)')
      .order('departure_date', { ascending: true })
      .limit(limit)

    if (status)   query = query.eq('status', status)
    if (tour_id)  query = query.eq('tour_id', tour_id)

    // Filter theo tháng: departure_date trong khoảng YYYY-MM-01 .. YYYY-MM-31
    if (month) {
      query = query
        .gte('departure_date', `${month}-01`)
        .lte('departure_date', `${month}-31`)
    }

    const { data, error } = await query
    if (error) throw error

    // Filter theo destination sau khi join (Supabase chưa hỗ trợ filter trên joined column dễ)
    const schedules = destination
      ? (data ?? []).filter(
          (s: { tour: { destination?: string | null } | null }) =>
            s.tour?.destination?.toLowerCase().includes(destination.toLowerCase())
        )
      : (data ?? [])

    return NextResponse.json({ schedules, total: schedules.length })
  } catch (err) {
    console.error('[GET /api/departures]', err)
    return NextResponse.json({ error: 'Không thể tải lịch khởi hành' }, { status: 500 })
  }
}

// ── POST /api/departures — trigger sync ────────────────────────────────────────

export async function POST(request: Request) {
  // Auth guard
  const incomingSecret = request.headers.get('x-webhook-secret')
  if (!incomingSecret || incomingSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = SyncTriggerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const result = await syncSeaStarSchedules()

    // Broadcast realtime để trang /lich-khoi-hanh tự refetch
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const supabase = createAdminClient()
      await supabase.channel('schedule-sync').send({
        type: 'broadcast',
        event: 'updated',
        payload: { synced: result.synced, at: new Date().toISOString() },
      })
    } catch (_) { /* broadcast lỗi không block response */ }

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[POST /api/departures]', err)
    return NextResponse.json({ error: 'Sync thất bại' }, { status: 500 })
  }
}
