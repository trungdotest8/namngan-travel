import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import TourDetailClient, { type RelatedTour } from './TourDetailClient'
import type { Tour, TourSchedule } from '@/types/tour.types'

export const revalidate = 3600

// UUID v4 pattern — dùng để backward-compat với URLs cũ dạng /tour/{UUID}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Static params ──────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ tourId: string }[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tours')
      .select('slug')
      .not('slug', 'is', null)
      .eq('is_active', true)
    return (data ?? [])
      .filter((t): t is { slug: string } => typeof t.slug === 'string')
      .map(t => ({ tourId: t.slug }))
  } catch {
    return []
  }
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: { tourId: string } }
): Promise<Metadata> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tours')
      .select('name, summary, description, thumbnail_url')
      .eq('slug', params.tourId)
      .eq('is_active', true)
      .maybeSingle()

    if (!data) return { title: 'Tour | Nam Ngân Travel' }

    const rawDesc = ((data.summary ?? data.description ?? '') as string).slice(0, 160)

    return {
      title: `${data.name as string} | Nam Ngân Travel`,
      description: rawDesc,
      openGraph: {
        title: `${data.name as string} | Nam Ngân Travel`,
        description: rawDesc,
        type: 'website',
        ...(data.thumbnail_url
          ? { images: [{ url: data.thumbnail_url as string }] }
          : {}),
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
  const supabase = await createClient()

  // Primary: query by slug (canonical URL)
  let { data: raw } = await supabase
    .from('tours')
    .select('*')
    .eq('slug', params.tourId)
    .eq('is_active', true)
    .maybeSingle()

  // Backward-compat: if slug lookup fails and value is a UUID, try by id
  if (!raw && UUID_RE.test(params.tourId)) {
    const { data: byId } = await supabase
      .from('tours')
      .select('*')
      .eq('id', params.tourId)
      .eq('is_active', true)
      .maybeSingle()
    raw = byId
  }

  if (!raw) notFound()

  const tour = raw as unknown as Tour

  // Open schedules from today onward
  const today = new Date().toISOString().split('T')[0]
  const { data: schData } = await supabase
    .from('tour_schedules')
    .select('*')
    .eq('tour_id', tour.id)
    .eq('status', 'open')
    .gte('departure_date', today)
    .order('departure_date', { ascending: true })
    .limit(10)

  const schedules = (schData ?? []) as unknown as TourSchedule[]

  // Related tours: same category, different code, limit 3
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
  const jsonLd       = buildJsonLd(tour, schedules)

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify ensures safe serialization — không đặt raw data trực tiếp
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="min-h-screen bg-[#F5F7FA]">
        <ErrorBoundary moduleName="TourDetailPage">
          <TourDetailClient tour={tour} schedules={schedules} relatedTours={relatedTours} />
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  )
}
