'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Clock, ChevronRight, ArrowLeft, Sparkles } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { TripGenieLeadModal, useTripGenieModal } from '@/components/booking/TripGenieLeadModal'
import { slugify } from '@/lib/utils'

interface Destination {
  name:      string
  image_url: string
}

interface TourItem {
  id:            string
  name:          string
  slug:          string | null
  destination:   string
  duration_days: number
  thumbnail_url: string | null
  min_price:     number | null
  country:       string | null
}

interface PageData {
  destination: Destination | null
  tours:       TourItem[]
}

function formatPrice(vnd: number) {
  return new Intl.NumberFormat('vi-VN').format(vnd) + 'đ'
}

export default function DiemDenDetailClient({ params }: { params: { slug: string } }) {
  const [data, setData]       = useState<PageData>({ destination: null, tours: [] })
  const [loading, setLoading] = useState(true)
  const modal                 = useTripGenieModal()
  const zaloUrl               = process.env.NEXT_PUBLIC_ZALO_URL ?? 'https://zalo.me/0932611933'

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const destRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/featured_destinations?select=name,image_url&is_active=eq.true`,
          {
            headers: {
              apikey:        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
            },
          }
        )
        const destinations: Destination[] = destRes.ok ? await destRes.json() : []
        const matched = destinations.find(d => slugify(d.name) === params.slug) ?? null

        let tours: TourItem[] = []
        if (matched) {
          const encoded  = encodeURIComponent(matched.name)
          const toursRes = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tours?or=(country.ilike.*${encoded}*,destination.ilike.*${encoded}*)&is_active=eq.true&select=id,name,slug,destination,duration_days,thumbnail_url,min_price,country&limit=12`,
            {
              headers: {
                apikey:        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
              },
            }
          )
          if (toursRes.ok) tours = await toursRes.json()
        }

        setData({ destination: matched, tours })
      } catch {
        // giữ state rỗng — UI hiển thị fallback
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.slug])

  const { destination, tours } = data
  const destName               = destination?.name ?? params.slug

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />

      <main className="flex-1">
        {/* Hero image */}
        <div className="relative w-full h-56 sm:h-80 md:h-96 overflow-hidden bg-[#005BAA]">
          {destination?.image_url && (
            <Image
              src={destination.image_url}
              alt={destName}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                <Link href="/" className="hover:text-white transition-colors">Trang chủ</Link>
                <ChevronRight size={13} />
                <Link href="/diem-den" className="hover:text-white transition-colors">Điểm đến</Link>
                <ChevronRight size={13} />
                <span className="text-white">{destName}</span>
              </div>
              <h1 className="text-white font-bold text-2xl sm:text-4xl flex items-center gap-3">
                <MapPin size={24} className="text-[#FF6B00] shrink-0" />
                {destName}
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <Link
            href="/diem-den"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#005BAA] hover:text-[#0078D7] transition-colors mb-8"
          >
            <ArrowLeft size={15} />
            Tất cả điểm đến
          </Link>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : tours.length > 0 ? (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A2E] mb-6">
                Tour {destName} ({tours.length} tour)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {tours.map(tour => (
                  <Link
                    key={tour.id}
                    href={tour.slug ? `/tour/${tour.slug}` : `/tour/${tour.id}`}
                    className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="relative h-48 overflow-hidden bg-[#F0F7FF]">
                      {tour.thumbnail_url ? (
                        <Image
                          src={tour.thumbnail_url}
                          alt={tour.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <MapPin size={32} className="text-[#005BAA]/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-[#1A1A2E] text-sm leading-snug line-clamp-2 group-hover:text-[#005BAA] transition-colors mb-2">
                        {tour.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-[#666666] mb-3">
                        <span className="flex items-center gap-1"><MapPin size={10} />{tour.destination}</span>
                        <span className="flex items-center gap-1"><Clock size={10} />{tour.duration_days} ngày</span>
                      </div>
                      {tour.min_price && (
                        <p className="mt-auto text-[#FF6B00] font-bold text-base">
                          Từ {formatPrice(tour.min_price)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <MapPin size={40} className="text-[#005BAA]/30 mx-auto mb-4" />
              <p className="text-[#666666] text-base mb-2">Chưa có tour cho điểm đến này.</p>
              <p className="text-[#666666] text-sm">Liên hệ để được tư vấn tour phù hợp.</p>
            </div>
          )}

          {/* CTA banner */}
          <div className="mt-12 bg-gradient-to-r from-[#005BAA] to-[#0078D7] rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-5">
            <div>
              <h3 className="font-bold text-xl mb-1">Muốn đi {destName}?</h3>
              <p className="text-white/80 text-sm">Nhận tư vấn lịch trình và báo giá miễn phí ngay hôm nay.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              {/* CTA 1: Tạo lịch trình — Accent Orange */}
              <button
                onClick={() => modal.open(destName)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B00] hover:bg-orange-600 text-white font-semibold rounded-full transition-colors"
              >
                <Sparkles size={15} />
                Tạo lịch trình
              </button>
              {/* CTA 2: Nhận tư vấn qua Zalo */}
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold rounded-full transition-colors"
              >
                Chat Zalo
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <TripGenieLeadModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        defaultDestination={modal.destination}
      />
    </div>
  )
}
