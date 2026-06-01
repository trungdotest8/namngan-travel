import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ItineraryResponse } from '@/types/pdf-index.types'

// GET /api/itinerary/[tourId]
// Child C dùng route này để lấy lịch trình:
//   1. Structured itinerary từ tours.itinerary (JSONB)
//   2. PDF embed từ tour_pdf_index (google_drive_link)
// Nếu cả hai đều null → 404

export async function GET(
  _req: NextRequest,
  { params }: { params: { tourId: string } }
) {
  const { tourId } = params

  if (!tourId) {
    return NextResponse.json({ error: 'tourId required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    // Lấy tour cơ bản
    const { data: tour, error: tourErr } = await supabase
      .from('tours')
      .select('id, code, name, destination, duration_days, thumbnail_url, includes, excludes, itinerary')
      .eq('id', tourId)
      .single()

    if (tourErr || !tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
    }

    // Tìm PDF mới nhất trong tour_pdf_index khớp tour_code
    let pdf: ItineraryResponse['pdf'] = null

    if (tour.code) {
      const { data: pdfRow } = await supabase
        .from('tour_pdf_index')
        .select('google_drive_id, google_drive_link, pdf_title, summary, crawled_at')
        .eq('tour_code', tour.code)
        .not('google_drive_link', 'is', null)
        .order('crawled_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pdfRow?.google_drive_link && pdfRow.google_drive_id) {
        pdf = {
          drive_link:  pdfRow.google_drive_link,
          drive_id:    pdfRow.google_drive_id,
          title:       pdfRow.pdf_title,
          summary:     pdfRow.summary,
          crawled_at:  pdfRow.crawled_at,
        }
      }
    }

    // Cả hai null → không có lịch trình
    if (!tour.itinerary && !pdf) {
      return NextResponse.json(
        { error: 'Itinerary not available for this tour' },
        { status: 404 }
      )
    }

    const response: ItineraryResponse = {
      tour_id:       tour.id,
      tour_code:     tour.code,
      tour_name:     tour.name,
      destination:   tour.destination ?? null,
      duration_days: tour.duration_days ?? null,
      thumbnail_url: tour.thumbnail_url ?? null,
      includes:      tour.includes ?? null,
      excludes:      tour.excludes ?? null,
      structured:    tour.itinerary ?? null,
      pdf,
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    })

  } catch (err) {
    console.error('[itinerary API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
