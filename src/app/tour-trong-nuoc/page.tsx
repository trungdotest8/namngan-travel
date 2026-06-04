import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import TourListingCard from '@/components/tours/TourListingCard'
import { Phone, MapPin } from 'lucide-react'

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
  duration_days: number | null
  category:      string | null
  thumbnail_url: string | null
  tour_schedules: ScheduleRow[]
}

interface ProcessedTour {
  id:             string
  name:           string
  destination:    string | null
  country:        null
  duration_days:  number | null
  thumbnail_url:  string | null
  next_departure: string | null
  min_price:      number | null
  category:       string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function processTours(tours: TourRow[]): ProcessedTour[] {
  const today = new Date().toISOString().slice(0, 10)
  return tours.map(t => {
    const openSchedules = (t.tour_schedules ?? [])
      .filter(s => s.status === 'open' && s.departure_date >= today)
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date))
    return {
      id:             t.id,
      name:           t.name,
      destination:    t.destination,
      country:        null,
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
  title:       'Tour Du Lịch Trong Nước — Nam Ngân Travel',
  description: 'Khám phá các tour du lịch trong nước hấp dẫn với Nam Ngân Travel. Lịch trình phong phú, giá tốt.',
}

export default async function TourTrongNuocPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tours')
    .select(`
      id, name, destination, duration_days, category, thumbnail_url,
      tour_schedules(departure_date, price_adult, status)
    `)
    .eq('is_active', true)
    .eq('category', 'trong nước')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[tour-trong-nuoc] Supabase error:', error.message)
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
              <span>Tour trong nước</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Tour Du Lịch Trong Nước</h1>
            <p className="text-blue-100 text-base md:text-lg max-w-xl">
              Khám phá vẻ đẹp Việt Nam — từ Hạ Long, Đà Nẵng, Phú Quốc đến Sapa và Hà Giang.
              Lịch trình linh hoạt, giá tốt, dịch vụ chu đáo.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          {tours.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <p className="text-sm text-[#666666] mb-6">
                Tìm thấy <span className="font-semibold text-[#1A1A2E]">{tours.length}</span> tour trong nước
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {tours.map((t, index) => (
                  <div
                    key={t.id}
                    className="animate-stagger"
                    style={{ '--i': Math.min(index, 11) } as CSSProperties}
                  >
                    <TourListingCard {...t} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-[#F0F7FF] flex items-center justify-center mb-5">
        <MapPin size={36} className="text-[#005BAA]" />
      </div>
      <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">
        Tour trong nước đang được cập nhật
      </h2>
      <p className="text-[#666666] max-w-sm mb-6">
        Chúng tôi đang hoàn thiện các tour trong nước.
        Liên hệ ngay để được tư vấn tour phù hợp với nhu cầu của bạn.
      </p>
      <a
        href="tel:0932611933"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#005BAA] text-white font-semibold rounded-full hover:bg-[#0078D7] transition-colors"
      >
        <Phone size={16} />
        0932 611 933
      </a>
    </div>
  )
}
