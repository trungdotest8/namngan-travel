import Link from 'next/link'
import TourCard from './TourCard'
import type { Tour } from '@/types'

interface TourWithPrice extends Tour {
  min_price?: number  // min(tour_schedules.price_adult) — join từ API
}

interface FeaturedToursProps {
  tours: TourWithPrice[]
}

export default function FeaturedTours({ tours }: FeaturedToursProps) {
  if (tours.length === 0) return null

  return (
    <section className="py-16 bg-white">
      <div className="container-main">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-brand-accent text-sm font-semibold uppercase tracking-widest mb-1">
              Được yêu thích
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-text-primary">
              Tour nổi bật
            </h2>
          </div>
          <Link
            href="/tours"
            className="text-sm font-semibold text-brand-blue hover:underline hidden sm:block"
          >
            Xem tất cả →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              minPrice={tour.min_price}
              featured
            />
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link href="/tours" className="text-sm font-semibold text-brand-blue hover:underline">
            Xem tất cả tour →
          </Link>
        </div>
      </div>
    </section>
  )
}
