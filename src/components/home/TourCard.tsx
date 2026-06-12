import Link from 'next/link'
import Image from 'next/image'
import { Clock, MapPin, Star } from 'lucide-react'
import type { Tour } from '@/types'

function toHttps(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http://') ? 'https://' + url.slice(7) : url
}

function formatPrice(vnd: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(vnd)
}

interface TourCardProps {
  tour:     Tour
  minPrice?: number  // price_adult từ TourSchedule gần nhất
  featured?: boolean
}

export default function TourCard({ tour, minPrice, featured = false }: TourCardProps) {
  return (
    <Link
      href={tour.slug ? `/tour/${tour.slug}` : `/tour/${tour.id}`}
      className="group relative flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm"
    >
      {/* shadow layer — opacity transition thay cho box-shadow transition */}
      <div className="absolute inset-0 rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" aria-hidden="true" />
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-brand-bg">
        {toHttps(tour.thumbnail_url) ? (
          <Image
            src={toHttps(tour.thumbnail_url)!}
            alt={tour.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            quality={75}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <MapPin size={40} />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {featured && (
            <span className="px-2 py-0.5 bg-brand-accent text-white text-[11px] font-bold rounded-full uppercase tracking-wide">
              Nổi bật
            </span>
          )}
          {tour.category && (
            <span className={`px-2 py-0.5 text-white text-[11px] font-semibold rounded-full ${
              tour.category === 'nước ngoài' ? 'bg-brand-blue' : 'bg-emerald-600'
            }`}>
              {tour.category === 'nước ngoài' ? 'Quốc tế' : 'Trong nước'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-semibold text-text-primary text-sm leading-snug line-clamp-2 group-hover:text-brand-blue transition-colors">
          {tour.name}
        </h3>

        <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
          {tour.destination && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {tour.destination}
            </span>
          )}
          {tour.duration_days && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {tour.duration_days} ngày
            </span>
          )}
          <span className="flex items-center gap-1 text-yellow-500">
            <Star size={11} fill="currentColor" />
            <span className="text-text-muted">4.8</span>
          </span>
        </div>

        <div className="mt-auto pt-3 flex items-end justify-between">
          <div>
            {minPrice != null ? (
              <>
                <p className="text-[10px] text-text-muted">Giá từ</p>
                <p className="text-brand-accent font-bold text-base leading-none">
                  {formatPrice(minPrice)}
                </p>
              </>
            ) : (
              <p className="text-xs text-text-muted">Liên hệ báo giá</p>
            )}
          </div>
          <span className="text-[11px] font-semibold text-brand-blue border border-brand-blue px-3 py-1 rounded-full group-hover:bg-brand-blue group-hover:text-white transition-colors">
            Xem tour
          </span>
        </div>
      </div>
    </Link>
  )
}
