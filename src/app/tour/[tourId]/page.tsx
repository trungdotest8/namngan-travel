import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import TourDetailClient, { type RelatedTour } from './TourDetailClient'
import type { Tour, TourSchedule } from '@/types/tour.types'

export const revalidate = 3600

// UUID v4 — bắt buộc kiểm tra trước khi so sánh cột id (tránh Postgres 22P02)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Static params ──────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ tourId: string }[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tours')
      .select('id, slug')
      .eq('is_active', true)
    // Dùng slug nếu có, ngược lại dùng id — khi slug=NULL toàn bộ dùng UUID
    return (data ?? []).map(t => ({ tourId: (t.slug as string | null) ?? (t.id as string) }))
  } catch {
    return []
  }
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: { tourId: string } }
): Promise<Metadata> {
  const param = decodeURIComponent(params.tourId).trim()
  try {
    const supabase = await createClient()
    const col = UUID_RE.test(param) ? 'id' : 'slug'
    const { data } = await supabase
      .from('tours')
      .select('name, summary, description, thumbnail_url, duration_days')
      .eq(col, param)
      .eq('is_active', true)
      .maybeSingle()

    if (!data) return { title: 'Tour | Nam Ngân Travel' }

    const name = data.name as string
    const rawDesc = (data.summary ?? data.description) as string | null
    const duration = data.duration_days as number | null
    const description = rawDesc
      ? rawDesc.slice(0, 160)
      : `${name}${duration ? ` — tour ${duration} ngày` : ''} do Nam Ngân Travel tổ chức. Liên hệ để nhận lịch và giá tốt nhất.`

    return {
      title: `${name} | Nam Ngân Travel`,
      description,
      openGraph: {
        title: `${name} | Nam Ngân Travel`,
        description,
        type: 'website',
        ...(data.thumbnail_url ? { images: [{ url: data.thumbnail_url as string }] } : {}),
      },
    }
  } catch {
    return { title: 'Tour | Nam Ngân Travel' }
  }
}

// ── JSON-LD ────────────────────────────────────────────────────────────────────

function buildJsonLd(tour: Tour, schedules: TourSchedule[]): Record<string, unknown> {
  const description = tour.summary ?? tour.description ?? undefined

  const itineraryBlock =
    Array.isArray(tour.itinerary) && tour.itinerary.length > 0
      ? {
          '@type': 'ItemList',
          itemListElement: tour.itinerary.map((day, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `Ngày ${day.day}: ${day.title ?? ''}`,
            description: day.description ?? '',
          })),
        }
      : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: tour.name,
    ...(description ? { description } : {}),
    ...(itineraryBlock ? { itinerary: itineraryBlock } : {}),
    ...(tour.thumbnail_url ? { image: tour.thumbnail_url } : {}),
    ...(schedules[0] ? { startDate: schedules[0].departure_date } : {}),
    provider: {
      '@type': 'TravelAgency',
      name: 'Nam Ngân Travel',
      url: 'https://www.namngantravel.com',
    },
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function TourDetailPage(
  { params }: { params: { tourId: string } }
) {
  const param = decodeURIComponent(params.tourId).trim()
  const supabase = await createClient()

  // ── 1. UUID-safe 2-step lookup ─────────────────────────────────────────────
  // KHÔNG đưa chuỗi không phải UUID vào cột id (tránh Postgres 22P02)
  let tour: Tour | null = null

  if (UUID_RE.test(param)) {
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .eq('id', param)
      .eq('is_active', true)
      .maybeSingle()
    if (error) {
      console.error('[tour-detail] id lookup:', error.message)
      notFound()
    }
    tour = data as Tour | null
  } else {
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .eq('slug', param)
      .eq('is_active', true)
      .maybeSingle()
    if (error) {
      console.error('[tour-detail] slug lookup:', error.message)
      notFound()
    }
    tour = data as Tour | null
  }

  if (!tour) notFound()

  // ── 2. Canonical redirect: UUID → slug khi slug đã có ─────────────────────
  if (UUID_RE.test(param) && tour.slug) {
    redirect(`/tour/${tour.slug}`)
  }

  // ── 3. Schedules — lỗi chỉ ẩn section, KHÔNG 500 cả trang ────────────────
  let schedules: TourSchedule[] = []
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: schData, error: schError } = await supabase
      .from('tour_schedules')
      .select('*')
      .eq('tour_id', tour.id)
      .eq('status', 'open')
      .gte('departure_date', today)
      .order('departure_date', { ascending: true })
      .limit(12)

    if (schError) {
      console.error('[tour-detail] schedules:', schError.message)
    } else {
      schedules = (schData ?? []) as TourSchedule[]
    }
  } catch (e) {
    console.error('[tour-detail] schedules exception:', e)
  }

  // ── 4. Related tours — lỗi chỉ ẩn section ────────────────────────────────
  let relatedTours: RelatedTour[] = []
  try {
    if (tour.category) {
      const { data: relData, error: relError } = await supabase
        .from('tours')
        .select('id, slug, name, duration_days, thumbnail_url, category')
        .eq('is_active', true)
        .eq('category', tour.category)
        .neq('code', tour.code)
        .limit(3)
      if (!relError) relatedTours = (relData ?? []) as unknown as RelatedTour[]
    }
  } catch (e) {
    console.error('[tour-detail] related:', e)
  }

  const jsonLd = buildJsonLd(tour, schedules)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="min-h-screen bg-[#F5F7FA]">
        <TourDetailClient
          tour={tour}
          schedules={schedules}
          relatedTours={relatedTours}
        />
      </main>
      <Footer />
    </>
  )
}
