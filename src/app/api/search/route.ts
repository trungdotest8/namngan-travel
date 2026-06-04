import { NextResponse } from 'next/server'
import { SearchCriteriaSchema } from '@/lib/validations/search.schema'
import { createClient } from '@/lib/supabase/server'
import type { Tour, TourSchedule, TourSearchResult } from '@/types'

// POST /api/search v2.1.0
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

    // Step 1: Search tours — OR across name + destination + country (ilike, case-insensitive)
    // Covers: user types "Trung Quốc" → matches country="TRUNG QUỐC" or destination="Trung Quốc"
    let toursQuery = supabase
      .from('tours')
      .select('*')
      .eq('is_active', true)
      .or(
        `name.ilike.%${destination}%,destination.ilike.%${destination}%,country.ilike.%${destination}%`
      )

    if (category) toursQuery = toursQuery.eq('category', category)
    if (tourName)  toursQuery = toursQuery.ilike('name', `%${tourName}%`)

    const { data: tours, error: toursError } = await toursQuery
    if (toursError) throw toursError
    if (!tours || tours.length === 0) {
      return NextResponse.json({ tours: [], total: 0 })
    }

    // Step 2: Query open schedules — date is optional (default: today onwards)
    const tourIds = tours.map((t) => t.id)
    const minDate = departureDate ?? new Date().toISOString().split('T')[0]

    let schedulesQuery = supabase
      .from('tour_schedules')
      .select('*')
      .in('tour_id', tourIds)
      .eq('status', 'open')
      .gte('departure_date', minDate)
      .order('departure_date', { ascending: true })

    if (meetingPoint) {
      schedulesQuery = schedulesQuery.ilike('meeting_point', `%${meetingPoint}%`)
    }

    const { data: schedules, error: schedulesError } = await schedulesQuery
    if (schedulesError) throw schedulesError

    // Step 3: Group schedules by tour_id, filter by available capacity
    const schedulesByTour = new Map<string, TourSchedule[]>()
    for (const s of schedules ?? []) {
      const available = s.seats_total - s.seats_booked
      if (totalPassengers > 0 && available < totalPassengers) continue
      const arr = schedulesByTour.get(s.tour_id) ?? []
      arr.push(s as TourSchedule)
      schedulesByTour.set(s.tour_id, arr)
    }

    // Step 4: Build results — include ALL matching tours, schedules may be empty
    const results: TourSearchResult[] = tours.map((tour) => {
      const matching = schedulesByTour.get(tour.id) ?? []
      const min_price =
        matching.length > 0 ? Math.min(...matching.map((s) => s.price_adult)) : 0
      return { ...(tour as Tour), min_price, schedules: matching }
    })

    // Sort: tours with schedules first, then by min_price
    results.sort((a, b) => {
      if (a.schedules.length > 0 && b.schedules.length === 0) return -1
      if (a.schedules.length === 0 && b.schedules.length > 0) return 1
      return a.min_price - b.min_price
    })

    return NextResponse.json({ tours: results, total: results.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
