'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Phone } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import TourDetail from '@/components/itinerary/TourDetail'
import PdfViewer from '@/components/itinerary/PdfViewer'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { ItineraryResponse } from '@/types/pdf-index.types'
import type { TourSchedule } from '@/types/tour.types'

export default function TourItineraryPage() {
  const { tourId } = useParams<{ tourId: string }>()
  const searchParams = useSearchParams()
  const scheduleId = searchParams.get('schedule')

  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null)
  const [schedule,  setSchedule]  = useState<TourSchedule | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!tourId) return

    async function load() {
      setLoading(true)
      setError(null)

      try {
        // Fetch itinerary và schedule song song
        const [itiRes, schRes] = await Promise.all([
          fetch(`/api/itinerary/${tourId}`),
          scheduleId
            ? fetch(`/api/departures?tour_id=${tourId}`)
            : Promise.resolve(null),
        ])

        if (!itiRes.ok) {
          if (itiRes.status === 404) {
            setError('Lịch trình đang được cập nhật. Vui lòng liên hệ tư vấn để biết thêm chi tiết.')
          } else {
            setError('Không thể tải lịch trình. Vui lòng thử lại sau.')
          }
          return
        }

        const itiData: ItineraryResponse = await itiRes.json()
        setItinerary(itiData)

        if (schRes?.ok) {
          const schData: { schedules: TourSchedule[] } = await schRes.json()
          const match = scheduleId
            ? schData.schedules?.find((s) => s.id === scheduleId)
            : schData.schedules?.[0]
          if (match) setSchedule(match)
        }
      } catch {
        setError('Lỗi kết nối. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [tourId, scheduleId])

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">

        {/* Back nav */}
        <div className="bg-white border-b border-gray-200">
          <div className="container-main py-3 flex items-center justify-between">
            <Link
              href="/lich-khoi-hanh"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-blue transition-colors"
            >
              <ArrowLeft size={16} />
              Quay lại Lịch Khởi Hành
            </Link>
            <a
              href="tel:0932611933"
              className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-blue px-4 py-1.5 rounded-full hover:bg-light-blue transition-colors"
            >
              <Phone size={14} />
              Giữ chỗ ngay
            </a>
          </div>
        </div>

        <div className="container-main py-6 max-w-3xl mx-auto">

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-48 bg-gray-200 rounded-xl" />
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3">
              <p className="text-amber-800 font-medium">{error}</p>
              <a
                href="tel:0932611933"
                className="inline-flex items-center gap-2 bg-brand-blue text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-light-blue transition-colors"
              >
                <Phone size={16} />
                Gọi tư vấn: 0932 611 933
              </a>
            </div>
          )}

          {/* Nội dung chính */}
          {!loading && !error && itinerary && (
            <div className="space-y-6">

              {/* TourDetail — structured itinerary */}
              <ErrorBoundary moduleName="TourDetail">
                <TourDetail
                  name={itinerary.tour_name}
                  destination={itinerary.destination}
                  durationDays={itinerary.duration_days}
                  thumbnailUrl={itinerary.thumbnail_url}
                  galleryUrls={itinerary.gallery_urls}
                  hashtags={itinerary.hashtags}
                  includes={itinerary.includes}
                  excludes={itinerary.excludes}
                  itinerary={itinerary.structured ?? undefined}
                  departureDate={schedule?.departure_date ?? new Date().toISOString().slice(0, 10)}
                  returnDate={schedule?.return_date ?? new Date().toISOString().slice(0, 10)}
                  priceAdult={schedule?.price_adult ?? 0}
                  priceChild={schedule?.price_child ?? 0}
                  seatsTotal={schedule?.seats_total ?? 0}
                  seatsBooked={schedule?.seats_booked ?? 0}
                  transport={schedule?.transport ?? null}
                  scheduleStatus={schedule?.status ?? 'open'}
                />
              </ErrorBoundary>

              {/* PdfViewer — nếu có PDF trên Drive */}
              {itinerary.pdf && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
                    📄 Lịch trình PDF đầy đủ
                  </p>
                  <PdfViewer pdf={itinerary.pdf} />
                </div>
              )}

            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  )
}
