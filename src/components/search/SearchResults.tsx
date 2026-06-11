'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, MapPin, Star, AlertCircle, Search } from 'lucide-react'
import { useSearchStore } from '@/store/search.store'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { TourSearchResult } from '@/types'

function formatPrice(vnd: number) {
  return new Intl.NumberFormat('vi-VN').format(vnd) + 'đ'
}

function TourResultCard({ tour }: { tour: TourSearchResult }) {
  const schedule = tour.schedules[0]
  return (
    <Link
      href={tour.slug ? `/tour/${tour.slug}` : `/tour/${tour.id}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all duration-200"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-bg">
        {tour.thumbnail_url ? (
          <Image
            src={tour.thumbnail_url}
            alt={tour.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-bg">
            <MapPin size={32} className="text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 text-white text-[10px] font-semibold rounded-full ${
            tour.category === 'nước ngoài' ? 'bg-brand-blue' : 'bg-emerald-600'
          }`}>
            {tour.category === 'nước ngoài' ? 'Quốc tế' : 'Trong nước'}
          </span>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Star size={9} fill="currentColor" className="text-yellow-400" />
          4.8
        </div>
      </div>

      <div className="flex flex-col flex-1 p-3 sm:p-4">
        <h3 className="font-semibold text-text-primary text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-brand-blue transition-colors mb-2">
          {tour.name}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
          <span className="flex items-center gap-1">
            <MapPin size={10} /> {tour.destination}
          </span>
          {tour.duration_days && (
            <span className="flex items-center gap-1">
              <Clock size={10} /> {tour.duration_days} ngày
            </span>
          )}
        </div>
        {schedule && (
          <p className="text-[11px] text-text-muted mb-3">
            Khởi hành: <span className="font-medium text-text-primary">{schedule.departure_date}</span>
            {schedule.seats_total - schedule.seats_booked > 0 && (
              <span className="ml-2 text-emerald-600 font-medium">
                · Còn {schedule.seats_total - schedule.seats_booked} chỗ
              </span>
            )}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-[10px] text-text-muted">Giá từ</p>
            <p className="text-brand-accent font-bold text-sm sm:text-base leading-none">
              {formatPrice(tour.min_price)}
            </p>
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-brand-blue border border-brand-blue px-2 sm:px-3 py-1 rounded-full group-hover:bg-brand-blue group-hover:text-white transition-colors whitespace-nowrap">
            Đặt ngay
          </span>
        </div>
      </div>
    </Link>
  )
}

function SearchResultsInner() {
  const { results, isSearching, hasSearched, error, criteria } = useSearchStore()

  if (!isSearching && !hasSearched) return null

  return (
    <section className="py-6 sm:py-10 bg-white border-t border-gray-100">
      <div className="container-main">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-brand-blue" />
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">
              {isSearching
                ? 'Đang tìm kiếm...'
                : `Kết quả tìm kiếm${criteria.destination ? ` — ${criteria.destination}` : ''}`}
            </h2>
          </div>
          {!isSearching && hasSearched && (
            <span className="text-sm text-text-muted">
              {results.length > 0 ? `${results.length} tour phù hợp` : ''}
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {isSearching && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-1/3 mt-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!isSearching && error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
            <AlertCircle size={18} className="flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isSearching && hasSearched && !error && results.length === 0 && (
          <div className="text-center py-12">
            <Search size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-text-primary font-semibold mb-1">Không tìm thấy tour phù hợp</p>
            <p className="text-text-muted text-sm">
              Thử thay đổi điểm đến, ngày đi hoặc nơi xuất phát
            </p>
          </div>
        )}

        {/* Results grid */}
        {!isSearching && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {results.map((tour) => (
              <TourResultCard key={tour.id} tour={tour as TourSearchResult} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function SearchResults() {
  return (
    <ErrorBoundary moduleName="SearchResults">
      <SearchResultsInner />
    </ErrorBoundary>
  )
}
