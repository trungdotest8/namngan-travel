'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { TourItineraryDay, TourScheduleStatus } from '@/types/tour.types'

interface TourDetailProps {
  // từ bảng tours
  name?: string
  destination?: string | null
  durationDays?: number | null
  thumbnailUrl?: string | null
  galleryUrls?: string[] | null
  hashtags?: string[]
  description?: string | null
  highlights?: string | null
  itinerary?: TourItineraryDay[] | null
  includes?: string[] | null
  excludes?: string[] | null
  // từ bảng tour_schedules
  departureDate?: string
  returnDate?: string
  priceAdult?: number
  priceChild?: number
  seatsTotal?: number
  seatsBooked?: number
  transport?: string | null
  scheduleStatus?: TourScheduleStatus
  // optional: embed Google Docs thay cho itinerary JSONB
  googleDocUrl?: string | null
}

function TourDetailInner({
  name = 'Hành Trình Miền Tây – Cần Thơ & Đồng Tháp',
  destination = 'Đồng Tháp',
  durationDays = 3,
  thumbnailUrl = 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=80',
  galleryUrls = null,
  hashtags = [],
  itinerary = [
    { day: 1, title: 'Khởi hành – Cần Thơ', description: 'Đón khách tại TP.HCM, di chuyển về Cần Thơ, tham quan chợ nổi Cái Răng.' },
    { day: 2, title: 'Đồng Tháp – Sen hồng mùa nước nổi', description: 'Thăm vườn quốc gia Tràm Chim, ngắm sếu đầu đỏ, trải nghiệm bữa cơm nhà dân.' },
    { day: 3, title: 'Trở về – Kết thúc hành trình', description: 'Tham quan làng hoa Sa Đéc, mua đặc sản, về TP.HCM buổi chiều.' },
  ],
  includes = ['Xe đưa đón', 'Khách sạn 3 sao', 'Ăn sáng', 'Hướng dẫn viên'],
  excludes = ['Vé máy bay', 'Chi phí cá nhân', 'Bảo hiểm du lịch'],
  departureDate = '2025-08-15',
  returnDate = '2025-08-17',
  priceAdult = 2490000,
  priceChild = 1800000,
  seatsTotal = 20,
  seatsBooked = 14,
  transport = 'Xe limousine',
  scheduleStatus = 'open',
  googleDocUrl = null,
}: TourDetailProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [lightboxIdx, setLightboxIdx]   = useState<number | null>(null)

  const allImages = [
    ...(thumbnailUrl ? [thumbnailUrl] : []),
    ...(galleryUrls ?? []),
  ]

  const openLightbox = useCallback((idx: number) => setLightboxIdx(idx), [])
  const closeLightbox = useCallback(() => setLightboxIdx(null), [])
  const prevImg = useCallback(() =>
    setLightboxIdx(i => i !== null ? (i - 1 + allImages.length) % allImages.length : null), [allImages.length])
  const nextImg = useCallback(() =>
    setLightboxIdx(i => i !== null ? (i + 1) % allImages.length : null), [allImages.length])

  useEffect(() => {
    if (lightboxIdx === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevImg()
      if (e.key === 'ArrowRight') nextImg()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIdx, closeLightbox, prevImg, nextImg])

  const days = durationDays ?? 1
  const total = seatsTotal ?? 0
  const booked = seatsBooked ?? 0
  const seatsLeft = total - booked
  const badge = deriveBadge(scheduleStatus ?? 'open', seatsLeft, total)
  const badgeStyle = deriveBadgeStyle(scheduleStatus ?? 'open', seatsLeft, total)
  const durationLabel = `${days} ngày ${days - 1} đêm`
  const fmtPrice = (n: number) => n.toLocaleString('vi-VN') + ' ₫'
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="w-full max-w-3xl mx-auto font-sans">

      {/* ── BANNER ── */}
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer"
        style={{ aspectRatio: '16/7' }}
        onClick={() => thumbnailUrl && openLightbox(0)}
        title={allImages.length > 1 ? 'Xem thư viện ảnh' : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic URL from admin/Supabase/Unsplash, domain unknown at build time */}
        <img src={thumbnailUrl ?? ''} alt={name} className="w-full h-full object-cover" />
        {allImages.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
            1 / {allImages.length}
          </span>
        )}
        {badge && (
          <span className={`absolute top-3 left-3 text-xs px-3 py-1 rounded-full font-medium ${badgeStyle}`}>
            {badge}
          </span>
        )}
      </div>

      {/* ── GALLERY GRID ── */}
      {(galleryUrls ?? []).length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(galleryUrls ?? []).slice(0, 6).map((url, i) => (
            <button
              key={url}
              onClick={() => openLightbox(i + 1)}
              className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#005BAA]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- gallery thumbnail, dynamic domain */}
              <img src={url} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              {i === 5 && (galleryUrls ?? []).length > 6 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">
                  +{(galleryUrls ?? []).length - 6} ảnh
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxIdx !== null && allImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); prevImg() }}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-2 transition-colors"
            aria-label="Ảnh trước"
          >
            <ChevronLeft size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- lightbox needs max-h/max-w viewport units, incompatible with next/image fill */}
          <img
            src={allImages[lightboxIdx]}
            alt={`Ảnh ${lightboxIdx + 1}/${allImages.length}`}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); nextImg() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-2 transition-colors"
            aria-label="Ảnh tiếp"
          >
            <ChevronRight size={28} />
          </button>
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 text-white rounded-full p-1.5 transition-colors"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightboxIdx + 1} / {allImages.length}
          </span>
        </div>
      )}

      {/* ── THÔNG TIN NHANH ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 py-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-medium text-gray-900 mb-1">{name}</h1>
          <p className="text-sm text-gray-500 mb-2">📍 {destination}</p>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {hashtags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-[#F0F7FF] text-[#005BAA] border border-[#005BAA]/20 font-medium"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <MetaChip icon="🕐" label={durationLabel} />
            <MetaChip icon="🚌" label={transport ?? ''} />
            <MetaChip icon="📅" label={`${fmtDate(departureDate)} → ${fmtDate(returnDate)}`} />
            <MetaChip icon="🪑" label={`Còn ${seatsLeft}/${total} chỗ`} warn={seatsLeft <= 3} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Giá từ</p>
          <p className="text-2xl font-medium text-gray-900">{fmtPrice(priceAdult)}</p>
          <p className="text-xs text-gray-500">/ người lớn</p>
          {priceChild > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{fmtPrice(priceChild)} / trẻ em</p>
          )}
        </div>
      </div>

      {/* ── DỊCH VỤ ── */}
      {((includes?.length ?? 0) > 0 || (excludes?.length ?? 0) > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {(includes?.length ?? 0) > 0 && (
            <ServiceList title="Bao gồm" items={includes ?? []} color="green" />
          )}
          {(excludes?.length ?? 0) > 0 && (
            <ServiceList title="Không bao gồm" items={excludes ?? []} color="red" />
          )}
        </div>
      )}

      <hr className="border-t border-gray-200 mb-4" />

      {/* ── LỊCH TRÌNH ── */}
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
        📋 Lịch trình chi tiết
      </p>

      {googleDocUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <span className="text-sm text-gray-400 animate-pulse">Đang tải lịch trình…</span>
            </div>
          )}
          <iframe
            src={googleDocUrl}
            title="Lịch trình tour chi tiết"
            className="w-full border-0 block"
            style={{ minHeight: '600px' }}
            sandbox="allow-same-origin allow-scripts allow-popups"
            loading="lazy"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {(itinerary ?? []).map((item) => (
            <ItineraryCard
              key={item.day}
              day={item.day}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-4">
        {googleDocUrl
          ? 'Nội dung lịch trình được cập nhật trực tiếp từ Google Docs.'
          : 'Lịch trình có thể thay đổi tùy điều kiện thực tế.'}
      </p>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function deriveBadge(
  status: TourScheduleStatus,
  seatsLeft: number,
  seatsTotal: number,
): string | null {
  if (status === 'cancelled') return 'Đã huỷ'
  if (status === 'completed') return 'Đã kết thúc'
  if (status === 'full' || seatsLeft === 0) return 'Hết chỗ'
  if (seatsLeft <= Math.ceil(seatsTotal * 0.2)) return `Còn ${seatsLeft} chỗ`
  return null
}

function deriveBadgeStyle(
  status: TourScheduleStatus,
  seatsLeft: number,
  seatsTotal: number,
): string {
  if (status === 'cancelled') return 'bg-gray-700 text-white'
  if (status === 'full' || seatsLeft === 0) return 'bg-red-600 text-white'
  if (seatsLeft <= Math.ceil(seatsTotal * 0.2)) return 'bg-orange-500 text-white'
  return 'bg-black/55 text-white backdrop-blur'
}

function MetaChip({ icon, label, warn = false }: { icon: string; label: string; warn?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border ${
        warn
          ? 'text-orange-600 bg-orange-50 border-orange-200'
          : 'text-gray-500 bg-gray-100 border-gray-200'
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  )
}

function ServiceList({ title, items, color }: { title: string; items: string[]; color: 'green' | 'red' }) {
  const colors: Record<'green' | 'red', string> = {
    green: 'text-green-700 bg-green-50 border-green-100',
    red:   'text-red-600 bg-red-50 border-red-100',
  }
  return (
    <div className={`rounded-lg border p-3 text-xs ${colors[color]}`}>
      <p className="font-medium mb-1.5">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1">
            <span aria-hidden="true">{color === 'green' ? '✓' : '✗'}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ItineraryCard({ day, title, description }: { day: number; title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-gray-200 p-3">
      <div className="shrink-0 w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
        N{day}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800 mb-0.5">{title}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

export default function TourDetail(props: TourDetailProps) {
  return (
    <ErrorBoundary moduleName="TourDetail">
      <TourDetailInner {...props} />
    </ErrorBoundary>
  )
}
