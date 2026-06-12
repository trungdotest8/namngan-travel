import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import TourDetailClient, { type RelatedTour } from './TourDetailClient'
import type { Tour, TourSchedule } from '@/types/tour.types'

export const revalidate = 3600

// UUID v4 pattern — backward-compat với URLs cũ dạng /tour/{UUID}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type TourWithSchedules = Tour & { tour_schedules: TourSchedule[] | null }

// ── Static params ──────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tours')
      .select('slug')
      .not('slug', 'is', null)
      .eq('is_active', true)
    return (data ?? [])
      .filter((t): t is { slug: string } => typeof t.slug === 'string')
      .map(t => ({ slug: t.slug }))
  } catch {
    return []
  }
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tours')
      .select('name, summary, description, thumbnail_url, duration_days')
      .eq('slug', params.slug)
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
  { params }: { params: { slug: string } }
) {
  const supabase = await createClient()

  // 1 round-trip: tour + tất cả schedules cùng lúc
  let { data: raw } = await supabase
    .from('tours')
    .select('*, tour_schedules(*)')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle()

  // Backward-compat: nếu slug lookup thất bại và giá trị là UUID, thử by id
  if (!raw && UUID_RE.test(params.slug)) {
    const { data: byId } = await supabase
      .from('tours')
      .select('*, tour_schedules(*)')
      .eq('id', params.slug)
      .eq('is_active', true)
      .maybeSingle()
    raw = byId
  }

  if (!raw) notFound()

  // Tách tour fields khỏi nested schedules
  const rawData = raw as unknown as TourWithSchedules
  const { tour_schedules: rawSchedules, ...tourRest } = rawData
  const tour = tourRest as unknown as Tour

  // Lọc + sort schedules trong JS: status=open, departure_date >= hôm nay, tăng dần
  const today = new Date().toISOString().split('T')[0]
  const schedules = ((rawSchedules ?? []) as TourSchedule[])
    .filter(s => s.status === 'open' && s.departure_date >= today)
    .sort((a, b) => a.departure_date.localeCompare(b.departure_date))
    .slice(0, 12)

  // Related tours: cùng category, khác code, limit 3
  const { data: relData } = tour.category
    ? await supabase
        .from('tours')
        .select('id, slug, name, duration_days, thumbnail_url, category')
        .eq('is_active', true)
        .eq('category', tour.category)
        .neq('code', tour.code)
        .limit(3)
    : { data: null }

  const relatedTours = (relData ?? []) as unknown as RelatedTour[]
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
