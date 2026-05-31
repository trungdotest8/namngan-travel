import { NextResponse } from 'next/server'
import { SearchCriteriaSchema } from '@/lib/validations/search.schema'
import { createClient } from '@/lib/supabase/server'
import type { Tour, TourSchedule, TourSearchResult } from '@/types'

// POST /api/search
// Nhận SearchCriteriaInput v2.0, query tours JOIN tour_schedules, trả TourSearchResult[]
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = SearchCriteriaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { destination, category, tourName, meetingPoint, departureDate, adults, children } =
      parsed.data
    const totalPassengers = adults + (children ?? 0)
    const supabase = await createClient()

    // Step 1: Query tours — is_active + destination (+ optional category/tourName)
    let toursQuery = supabase
      .from('tours')
      .select('*')
      .eq('is_active', true)
      .ilike('destination', `%${destination}%`)

    if (category) toursQuery = toursQuery.eq('category', category)
    if (tourName) toursQuery = toursQuery.ilike('name', `%${tourName}%`)

    const { data: tours, error: toursError } = await toursQuery
    if (toursError) throw toursError
    if (!tours || tours.length === 0) {
      return NextResponse.json({ tours: [], total: 0 })
    }

    // Step 2: Query open schedules for those tours matching date + meeting_point
    const tourIds = tours.map((t) => t.id)
    let schedulesQuery = supabase
      .from('tour_schedules')
      .select('*')
      .in('tour_id', tourIds)
      .eq('status', 'open')
      .eq('departure_date', departureDate)

    if (meetingPoint) {
      schedulesQuery = schedulesQuery.ilike('meeting_point', `%${meetingPoint}%`)
    }

    const { data: schedules, error: schedulesError } = await schedulesQuery
    if (schedulesError) throw schedulesError

    // Step 3: Group schedules by tour_id, filter by available capacity
    const schedulesByTour = new Map<string, TourSchedule[]>()
    for (const s of schedules ?? []) {
      const available = s.seats_total - s.seats_booked
      if (available < totalPassengers) continue
      const arr = schedulesByTour.get(s.tour_id) ?? []
      arr.push(s as TourSchedule)
      schedulesByTour.set(s.tour_id, arr)
    }

    // Step 4: Build results — only tours that have at least one matching schedule
    const results: TourSearchResult[] = []
    for (const tour of tours) {
      const matching = schedulesByTour.get(tour.id)
      if (!matching || matching.length === 0) continue
      const min_price = Math.min(...matching.map((s) => s.price_adult))
      results.push({ ...(tour as Tour), min_price, schedules: matching })
    }

    return NextResponse.json({ tours: results, total: results.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
