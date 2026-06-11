import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { COUNTRY_MAP, SLUG_TO_COUNTRY, countryToSlug } from '@/lib/tour-country'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CountryToursClient from './CountryToursClient'
import type { TourListingCardProps } from '@/components/tours/TourListingCard'
import { Globe, Plane, Calendar } from 'lucide-react'

// ── Static data ───────────────────────────────────────────────────────────────

const COUNTRY_HERO_IMAGE: Record<string, string> = {
  'Nhật Bản':   'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80',
  'Hàn Quốc':  'https://images.unsplash.com/photo-1538485399081-7c8272e29df8?w=1200&q=80',
  'Thái Lan':  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=80',
  'Trung Quốc': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1200&q=80',
  'Singapore':  'https://images.unsplash.com/photo-1525625293412-b53e40e32ded?w=1200&q=80',
  'Hồng Kông':  'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=1200&q=80',
  'Đài Loan':   'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?w=1200&q=80',
  'Mỹ':         'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=1200&q=80',
  'Canada':     'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80',
  'Châu Âu':   'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&q=80',
  'Bali':       'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80',
  'Indonesia':  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80',
  'Việt Nam':  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80',
}

const DEFAULT_HERO = 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200&q=80'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleRow {
  departure_date: string
  price_adult:    number
  status:         string
}

interface TourRow {
  id:             string
  name:           string
  slug:           string
  destination:    string | null
  country:        string | null
  duration_days:  number | null
  thumbnail_url:  string | null
  hashtags:       string[] | null
  category:       string | null
  tour_schedules: ScheduleRow[]
}

interface AffiliateRow {
  id:              string
  provider:        string
  label:           string
  tracking_url:    string
  commission_rate: number
  product_type:    string
}

// ── generateStaticParams ──────────────────────────────────────────────────────

export function generateStaticParams() {
  return Object.keys(COUNTRY_MAP).map(name => ({
    country: countryToSlug(name),
  }))
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>
}): Promise<Metadata> {
  const { country: slug } = await params
  const country = SLUG_TO_COUNTRY[slug]
  if (!country) return { title: 'Điểm Đến — Nam Ngân Travel' }

  const heroImage = COUNTRY_HERO_IMAGE[country] ?? DEFAULT_HERO

  return {
    title:       `Du Lịch ${country} — Tour Trọn Gói Uy Tín | Nam Ngân Travel`,
    description: `Khám phá ${country} cùng Nam Ngân Travel. Tour trọn gói chất lượng cao, giá cạnh tranh. Tư vấn lịch trình miễn phí, đặt tour ngay hôm nay.`,
    keywords:    [`du lịch ${country}`, `tour ${country}`, `${country} trọn gói`, 'nam ngân travel'],
    openGraph: {
      title:       `Du Lịch ${country} — Nam Ngân Travel`,
      description: `Tour ${country} trọn gói từ Nam Ngân Travel. Hành trình chuyên nghiệp, giá tốt nhất.`,
      images:      [{ url: heroImage, width: 1200, height: 630, alt: `Du lịch ${country}` }],
      type:        'website',
    },
    alternates: {
      canonical: `https://namngantravel.com/du-lich/${slug}`,
    },
  }
}

// ── JSON-LD ───────────────────────────────────────────────────────────────────

function buildJsonLd(country: string, slug: string, tourCount: number) {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ',       item: 'https://namngantravel.com' },
      { '@type': 'ListItem', position: 2, name: 'Tour nước ngoài', item: 'https://namngantravel.com/tour-nuoc-ngoai' },
      { '@type': 'ListItem', position: 3, name: `Du lịch ${country}`, item: `https://namngantravel.com/du-lich/${slug}` },
    ],
  }

  const itemList = {
    '@context': 'https://schema.org',
    '@type':    'ItemList',
    name:       `Tour Du Lịch ${country} — Nam Ngân Travel`,
    description: `${tourCount} tour trọn gói đến ${country} từ Nam Ngân Travel`,
    url:        `https://namngantravel.com/du-lich/${slug}`,
    numberOfItems: tourCount,
  }

  return [breadcrumb, itemList]
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DuLichCountryPage({
  params,
}: {
  params: Promise<{ country: string }>
}) {
  const { country: slug } = await params
  const country = SLUG_TO_COUNTRY[slug]
  if (!country) notFound()

  const supabase = createAdminClient()
  const today   = new Date().toISOString().slice(0, 10)

  const [toursResult, affiliatesResult] = await Promise.all([
    supabase
      .from('tours')
      .select(`
        id, name, slug, destination, country, duration_days,
        thumbnail_url, hashtags, category,
        tour_schedules(departure_date, price_adult, status)
      `)
      .eq('is_active', true)
      .ilike('country', country)
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliate_links')
      .select('id, provider, label, tracking_url, commission_rate, product_type')
      .eq('is_active', true)
      .ilike('destination', country)
      .order('commission_rate', { ascending: false }),
  ])

  const rawTours     = (toursResult.data   as TourRow[]    | null) ?? []
  const affiliates   = (affiliatesResult.data as AffiliateRow[] | null) ?? []

  const tours: TourListingCardProps[] = rawTours.map(t => {
    const openSchedules = (t.tour_schedules ?? [])
      .filter(s => s.status === 'open' && s.departure_date >= today)
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date))
    return {
      id:             t.id,
      slug:           t.slug,
      name:           t.name,
      destination:    t.destination,
      country:        t.country,
      duration_days:  t.duration_days,
      thumbnail_url:  t.thumbnail_url,
      next_departure: openSchedules[0]?.departure_date ?? null,
      min_price:      openSchedules.length > 0
        ? Math.min(...openSchedules.map(s => s.price_adult))
        : null,
      category:       t.category,
      hashtags:       t.hashtags ?? [],
    }
  })

  const upcomingCount = tours.filter(t => t.next_departure).length
  const heroImage     = COUNTRY_HERO_IMAGE[country] ?? DEFAULT_HERO
  const jsonLd        = buildJsonLd(country, slug, tours.length)

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section
          className="relative bg-cover bg-center text-white pt-12 pb-0 px-4"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#003d80]/80 via-[#005BAA]/70 to-[#0078D7]/60" />
          <div className="relative max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="flex items-center gap-2 text-blue-200 text-sm mb-4">
              <a href="/" className="hover:text-white transition-colors">Trang chủ</a>
              <span>/</span>
              <a href="/tour-nuoc-ngoai" className="hover:text-white transition-colors">Tour nước ngoài</a>
              <span>/</span>
              <span className="text-white">Du lịch {country}</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-10">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
                  Du Lịch {country}
                </h1>
                <p className="text-blue-100 text-base max-w-xl leading-relaxed">
                  Khám phá {country} cùng Nam Ngân Travel — tour trọn gói chất lượng cao,
                  lịch trình linh hoạt, giá cạnh tranh và dịch vụ chu đáo từ A đến Z.
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-3 shrink-0">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[72px]">
                  <div className="flex justify-center mb-1"><Plane size={16} className="text-blue-200" /></div>
                  <div className="text-2xl font-bold">{tours.length}</div>
                  <div className="text-xs text-blue-200 mt-0.5">Tour</div>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[72px]">
                  <div className="flex justify-center mb-1"><Calendar size={16} className="text-blue-200" /></div>
                  <div className="text-2xl font-bold">{upcomingCount}</div>
                  <div className="text-xs text-blue-200 mt-0.5">Lịch gần</div>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[72px]">
                  <div className="flex justify-center mb-1"><Globe size={16} className="text-blue-200" /></div>
                  <div className="text-2xl font-bold">{affiliates.length}</div>
                  <div className="text-xs text-blue-200 mt-0.5">Đối tác</div>
                </div>
              </div>
            </div>
          </div>

          {/* Wave */}
          <div className="relative h-6 bg-[#F8FAFC] rounded-t-[2rem]" />
        </section>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <Suspense fallback={
            <div className="text-center py-16 text-[#666666] text-sm">Đang tải danh sách tour...</div>
          }>
            {tours.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <p className="text-4xl mb-4">✈️</p>
                <h2 className="text-lg font-semibold text-[#1A1A2E] mb-2">
                  Tour {country} đang được cập nhật
                </h2>
                <p className="text-sm text-[#666666] mb-6 max-w-md">
                  Chúng tôi đang hoàn thiện các tour {country}. Liên hệ ngay để được tư vấn lịch trình theo yêu cầu.
                </p>
                <a
                  href="/tour-nuoc-ngoai"
                  className="px-6 py-2.5 bg-[#005BAA] text-white text-sm font-semibold rounded-full hover:bg-[#0078D7] transition-colors"
                >
                  Xem tất cả tour nước ngoài
                </a>
              </div>
            ) : (
              <CountryToursClient
                tours={tours}
                country={country}
                affiliates={affiliates}
              />
            )}
          </Suspense>
        </section>
      </main>

      <Footer />
    </div>
  )
}
