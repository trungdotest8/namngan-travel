import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { deriveCountry } from '@/lib/tour-country'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import InternationalToursClient from './InternationalToursClient'
import type { TourListingCardProps } from '@/components/tours/TourListingCard'
import { Globe, Plane, Calendar } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleRow {
  departure_date: string
  price_adult:    number
  status:         string
}

interface TourRow {
  id:             string
  slug:           string | null
  name:           string
  destination:    string | null
  country:        string | null
  duration_days:  number | null
  category:       string | null
  thumbnail_url:  string | null
  hashtags:       string[] | null
  tour_schedules: ScheduleRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function processTours(tours: TourRow[]): TourListingCardProps[] {
  const today = new Date().toISOString().slice(0, 10)
  return tours.map(t => {
    const openSchedules = (t.tour_schedules ?? [])
      .filter(s => s.status === 'open' && s.departure_date >= today)
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date))

    const rawCountry = t.country ?? (deriveCountry(t.destination) !== 'Khác' ? deriveCountry(t.destination) : null)
    // Normalize DB value (may be ALL CAPS) to canonical title case via deriveCountry
    const country = rawCountry
      ? (deriveCountry(rawCountry) !== 'Khác' ? deriveCountry(rawCountry) : rawCountry)
      : null

    return {
      id:             t.id,
      slug:           t.slug,
      name:           t.name,
      destination:    t.destination,
      country,
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
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const metadata = {
  title:       'Tour Du Lịch Nước Ngoài — Nam Ngân Travel',
  description: 'Khám phá tour quốc tế: Nhật Bản, Hàn Quốc, Thái Lan, Singapore và nhiều điểm đến hấp dẫn cùng Nam Ngân Travel.',
}

export default async function TourNuocNgoaiPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tours')
    .select(`
      id, slug, name, destination, country, duration_days, category, thumbnail_url, hashtags,
      tour_schedules(departure_date, price_adult, status)
    `)
    .eq('is_active', true)
    .eq('category', 'nước ngoài')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[tour-nuoc-ngoai] Supabase error:', error.message)
  }

  const tours = processTours((data as TourRow[] | null) ?? [])

  // Stats for hero
  const countrySet   = new Set(tours.map(t => t.country ?? 'Khác').filter(Boolean))
  const totalCountries = countrySet.size
  const upcomingCount  = tours.filter(t => t.next_departure).length

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#003d80] via-[#005BAA] to-[#0078D7] text-white pt-12 pb-0 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-blue-200 text-sm mb-4">
              <a href="/" className="hover:text-white transition-colors">Trang chủ</a>
              <span>/</span>
              <span className="text-white">Tour quốc tế</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-10">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
                  Tour Du Lịch Quốc Tế
                </h1>
                <p className="text-blue-100 text-base max-w-lg leading-relaxed">
                  Hành trình đến Nhật Bản, Hàn Quốc, Thái Lan, Singapore và hơn 15 quốc gia.
                  Trọn gói, dịch vụ chu đáo, giá cạnh tranh.
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-4 shrink-0">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
                  <div className="flex justify-center mb-1"><Plane size={18} className="text-blue-200" /></div>
                  <div className="text-2xl font-bold">{tours.length}</div>
                  <div className="text-xs text-blue-200 mt-0.5">Tour</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
                  <div className="flex justify-center mb-1"><Globe size={18} className="text-blue-200" /></div>
                  <div className="text-2xl font-bold">{totalCountries}</div>
                  <div className="text-xs text-blue-200 mt-0.5">Quốc gia</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
                  <div className="flex justify-center mb-1"><Calendar size={18} className="text-blue-200" /></div>
                  <div className="text-2xl font-bold">{upcomingCount}</div>
                  <div className="text-xs text-blue-200 mt-0.5">Lịch gần</div>
                </div>
              </div>
            </div>
          </div>

          {/* Wave divider */}
          <div className="h-6 bg-[#F8FAFC] rounded-t-[2rem]" />
        </section>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <Suspense fallback={
            <div className="text-center py-16 text-[#666666] text-sm">Đang tải danh sách tour...</div>
          }>
            <InternationalToursClient tours={tours} />
          </Suspense>
        </section>
      </main>

      <Footer />
    </div>
  )
}
