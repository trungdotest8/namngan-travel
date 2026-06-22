import Link from 'next/link'
import Image from 'next/image'
import { MapPin, ChevronRight } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { DestinationCard } from '@/components/destination/DestinationCard'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata = {
  title:       'Điểm Đến Nổi Bật — Nam Ngân Travel',
  description: 'Khám phá các điểm đến du lịch hấp dẫn nhất: Nhật Bản, Hàn Quốc, Trung Quốc, Phú Quốc, Đà Nẵng, Hà Giang và nhiều hơn nữa.',
  openGraph: {
    title:       'Điểm Đến Nổi Bật — Nam Ngân Travel',
    description: 'Khám phá các điểm đến du lịch hấp dẫn nhất cùng Nam Ngân Travel.',
    images:      ['/og-default.jpg'],
  },
}

// ── JSON-LD: TravelAgency ─────────────────────────────────────────────────────

const travelAgencySchema = {
  '@context': 'https://schema.org',
  '@type':    'TravelAgency',
  name:       'Nam Ngân Travel',
  url:        'https://namngantravel.com',
  logo:       'https://namngantravel.com/logo.png',
  description: 'Công ty du lịch Nam Ngân Travel — chuyên tour trọn gói trong nước và quốc tế.',
  address: {
    '@type':          'PostalAddress',
    streetAddress:    '525/44 Huỳnh Văn Bánh',
    addressLocality:  'Quận Phú Nhuận',
    addressRegion:    'TP. Hồ Chí Minh',
    addressCountry:   'VN',
  },
  email: 'dulichnamngan@gmail.com',
  telephone: '+84932611933',
}

// ── Fallback data ─────────────────────────────────────────────────────────────

const DEST_FALLBACK = [
  { name: 'Nhật Bản',  image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80' },
  { name: 'Hàn Quốc', image_url: 'https://images.unsplash.com/photo-1538485399081-7c8272e29df8?w=600&q=80' },
  { name: 'Trung Quốc', image_url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&q=80' },
  { name: 'Thái Lan',  image_url: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&q=80' },
  { name: 'Phú Quốc',  image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
  { name: 'Đà Nẵng',   image_url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&q=80' },
  { name: 'Hà Giang',  image_url: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=600&q=80' },
  { name: 'Đà Lạt',    image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80' },
  { name: 'Sapa',      image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DiemDenPage() {
  let destinations: { name: string; image_url: string }[] = DEST_FALLBACK

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('featured_destinations')
      .select('name, image_url')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (data && data.length > 0) destinations = data
  } catch {
    // giữ fallback
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(travelAgencySchema) }}
      />

      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#003d80] via-[#005BAA] to-[#0078D7] text-white pt-12 pb-0 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-blue-200 text-sm mb-4">
              <Link href="/" className="hover:text-white transition-colors">Trang chủ</Link>
              <span>/</span>
              <span className="text-white">Điểm đến</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <MapPin size={28} className="text-[#FF6B00]" />
              <h1 className="text-3xl md:text-4xl font-bold">Điểm Đến Nổi Bật</h1>
            </div>
            <p className="text-blue-100 text-base max-w-lg mb-2">
              Hàng chục điểm đến trong nước và quốc tế đang chờ bạn khám phá cùng Nam Ngân Travel.
            </p>
          </div>
          <div className="h-6 bg-[#F8FAFC] rounded-t-[2rem] mt-8" />
        </section>

        {/* Destinations grid */}
        <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {destinations.map((dest) => (
              <DestinationCard
                key={dest.name}
                name={dest.name}
                slug={slugify(dest.name)}
                image_url={dest.image_url}
              />
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section className="bg-[#F0F7FF] py-10 sm:py-14">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E] mb-3">
              Không biết nên chọn điểm đến nào?
            </h2>
            <p className="text-[#666666] mb-6">
              Để lại thông tin, chuyên viên Nam Ngân sẽ tư vấn miễn phí theo ngân sách và sở thích của bạn.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/tao-lich-trinh"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#FF6B00] hover:bg-orange-600 text-white font-semibold rounded-full transition-colors shadow-md"
              >
                Tạo lịch trình miễn phí
                <ChevronRight size={16} />
              </Link>
              <a
                href={process.env.NEXT_PUBLIC_ZALO_URL ?? 'https://zalo.me/0932611933'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-[#005BAA] text-[#005BAA] font-semibold rounded-full hover:bg-[#F0F7FF] transition-colors"
              >
                Nhận tư vấn qua Zalo
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
