import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { deriveCountry } from '@/lib/tour-country'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import InternationalToursClient from './InternationalToursClient'
import type { TourListingCardProps } from '@/components/tours/TourListingCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleRow {
  departure_date: string
  price_adult:    number
  status:         string
}

interface TourRow {
  id:             string
  name:           string
  destination:    string | null
  country:        string | null
  duration_days:  number | null
  category:       string | null
  thumbnail_url:  string | null
  tour_schedules: ScheduleRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function processTours(tours: TourRow[]): TourListingCardProps[] {
  const today = new Date().toISOString().slice(0, 10)
  return tours.map(t => {
    const openSchedules = (t.tour_schedules ?? [])
      .filter(s => s.status === 'open' && s.departure_date >= today)
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date))

    // Dùng country từ DB nếu có, fallback deriveCountry từ destination
    const country = t.country ?? (deriveCountry(t.destination) !== 'Khác' ? deriveCountry(t.destination) : null)

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
      id, name, destination, country, duration_days, category, thumbnail_url,
      tour_schedules(departure_date, price_adult, status)
    `)
    .eq('is_active', true)
    .eq('category', 'nước ngoài')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[tour-nuoc-ngoai] Supabase error:', error.message)
  }

  const tours = processTours((data as TourRow[] | null) ?? [])

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
              <span>Tour quốc tế</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Tour Du Lịch Quốc Tế</h1>
            <p className="text-blue-100 text-base md:text-lg max-w-xl">
              Hành trình đến Nhật Bản, Hàn Quốc, Thái Lan, Singapore, Trung Quốc và hơn 15 quốc gia.
              Trải nghiệm văn hóa đa dạng cùng Nam Ngân Travel.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <Suspense fallback={<div className="text-[#666666] text-sm">Đang tải...</div>}>
            <InternationalToursClient tours={tours} />
          </Suspense>
        </section>
      </main>

      <Footer />
    </div>
  )
}
