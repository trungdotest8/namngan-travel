import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { deriveCountry } from '@/lib/tour-country'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ToursClient from './ToursClient'
import type { TourListingCardProps } from '@/components/tours/TourListingCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleRow {
  departure_date: string
  price_adult:    number
  status:         string
}

interface TourRow {
  id:            string
  name:          string
  destination:   string | null
  country:       string | null
  duration_days: number | null
  category:      string | null
  thumbnail_url: string | null
  tour_schedules: ScheduleRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function processTours(tours: TourRow[]): TourListingCardProps[] {
  const today = new Date().toISOString().slice(0, 10)
  return tours.map(t => {
    const openSchedules = (t.tour_schedules ?? [])
      .filter(s => s.status === 'open' && s.departure_date >= today)
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date))

    const isIntl  = t.category === 'nước ngoài'
    const country = t.country ??
      (isIntl && deriveCountry(t.destination) !== 'Khác' ? deriveCountry(t.destination) : null)

    return {
      id:             t.id,
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
    }
  })
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata = {
  title:       'Tất Cả Tour Du Lịch — Nam Ngân Travel',
  description: 'Khám phá đầy đủ tour trong nước và quốc tế của Nam Ngân Travel. Nhật Bản, Hàn Quốc, Thái Lan, Hạ Long, Đà Nẵng, Phú Quốc và hơn thế nữa.',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ToursPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tours')
    .select(`
      id, name, destination, country, duration_days, category, thumbnail_url,
      tour_schedules(departure_date, price_adult, status)
    `)
    .eq('is_active', true)
    .order('category', { ascending: true })   // 'nước ngoài' trước 'trong nước'
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[tours] Supabase error:', error.message)
  }

  const tours = processTours((data as TourRow[] | null) ?? [])
  const intlCount     = tours.filter(t => t.category === 'nước ngoài').length
  const domesticCount = tours.filter(t => t.category === 'trong nước').length

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#005BAA] to-[#0078D7] text-white py-14 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-blue-200 text-sm mb-3">
              <a href="/" className="hover:text-white transition-colors">Trang chủ</a>
              <span>/</span>
              <span>Tất cả tour</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Tất Cả Tour Du Lịch</h1>
            <p className="text-blue-100 text-base md:text-lg max-w-xl">
              Khám phá <span className="font-semibold text-white">{intlCount} tour quốc tế</span> và{' '}
              <span className="font-semibold text-white">{domesticCount} tour trong nước</span> —
              hành trình trọn gói, giá tốt, dịch vụ chu đáo cùng Nam Ngân Travel.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <Suspense fallback={
            <div className="text-[#666666] text-sm py-10 text-center">Đang tải danh sách tour...</div>
          }>
            <ToursClient tours={tours} />
          </Suspense>
        </section>
      </main>

      <Footer />
    </div>
  )
}
