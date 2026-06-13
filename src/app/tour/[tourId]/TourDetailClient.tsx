'use client'

import { useState } from 'react'
import {
  CheckCircle2, XCircle, Calendar, Phone,
  MapPin, Clock, Tag, Plane, Users, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import BookingModal from '@/components/booking/BookingModal'
import { TripGenieLeadModal, useTripGenieModal } from '@/components/booking/TripGenieLeadModal'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import BookingScheduleButton from '@/components/tour/BookingScheduleButton'
import TourLeadBox from '@/components/tour/TourLeadBox'
import TourTabNav from '@/components/tour/TourTabNav'
import TourTimeline from '@/components/tour/TourTimeline'
import TourGallery from '@/components/tour/TourGallery'
import type { Tour, TourSchedule } from '@/types/tour.types'

export interface RelatedTour {
  id:            string
  slug:          string | null
  name:          string
  duration_days: number | null
  thumbnail_url: string | null
  category:      string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDateShort(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit',
  })
}

function formatDuration(days: number | null): string {
  if (!days || days <= 0) return ''
  const nights = days - 1
  return nights <= 0 ? `${days} ngày` : `${days}N${nights}Đ`
}

function parseHighlights(raw: string | null): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string').filter(Boolean)
      }
    } catch { /* fall through */ }
  }
  return trimmed
    .split('\n')
    .map(s => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
}

const AIRLINE_MAP: Record<string, string> = {
  VN: 'Vietnam Airlines',
  VJ: 'Vietjet Air',
  QH: 'Bamboo Airways',
  BL: 'Pacific Airlines',
  VU: 'Vietravel Airlines',
  TH: 'Viettravel Airlines',
  FD: 'AirAsia',
  QW: 'Qingdao Airlines',
  CZ: 'China Southern',
  MF: 'Xiamen Air',
  MU: 'China Eastern',
  CA: 'Air China',
}

function airlineName(code: string | null): string {
  if (!code) return '—'
  const prefix = code.split('-')[0]?.toUpperCase() ?? ''
  return AIRLINE_MAP[prefix] ? `${AIRLINE_MAP[prefix]} (${code})` : code
}

function slotsLabel(s: TourSchedule): { text: string; cls: string } {
  const avail = Math.max(0, (s.seats_total ?? 0) - (s.seats_booked ?? 0))
  if (avail === 0) return { text: 'Hết chỗ', cls: 'text-red-500 font-medium' }
  if (avail <= 5)  return { text: `Còn ${avail} chỗ`, cls: 'text-orange-500 font-medium' }
  return { text: `${avail} chỗ`, cls: 'text-[#666666]' }
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  tour:         Tour
  schedules:    TourSchedule[]
  relatedTours: RelatedTour[]
}

export default function TourDetailClient({ tour, schedules, relatedTours }: Props) {
  const [floatingBookingOpen, setFloatingBookingOpen] = useState(false)
  const lead = useTripGenieModal()

  // ── Derived ──────────────────────────────────────────────────────────────────
  const highlights = parseHighlights(tour.highlights)
  const inclusions = (tour.inclusions ?? []).filter(Boolean)
  const exclusions = (tour.exclusions ?? []).filter(Boolean)
  const itinerary  = Array.isArray(tour.itinerary) ? tour.itinerary : []
  const destination = tour.destination ?? tour.country ?? null

  const categorySlug = tour.category === 'trong nước' ? 'tour-trong-nuoc'
                     : tour.category === 'nước ngoài'  ? 'tour-nuoc-ngoai'
                     : 'tours'
  const categoryLabel = tour.category === 'trong nước' ? 'Tour Trong Nước'
                      : tour.category === 'nước ngoài'  ? 'Tour Nước Ngoài'
                      : (tour.category ?? 'Tour')

  const duration = formatDuration(tour.duration_days)

  // Lịch open gần nhất
  const nextSchedule = schedules[0] ?? null
  const minPrice = schedules.length > 0
    ? Math.min(...schedules.map(s => s.price_adult))
    : null

  // Airline từ lịch gần nhất
  const airlineLabel = nextSchedule?.flight_code_departure
    ? airlineName(nextSchedule.flight_code_departure)
    : null

  // Slots available từ lịch gần nhất
  const slotsAvail = nextSchedule
    ? Math.max(0, (nextSchedule.seats_total ?? 0) - (nextSchedule.seats_booked ?? 0))
    : null

  // Info block 4 ô — chỉ render ô có data
  const infoItems: { label: string; value: string; icon: React.ReactNode }[] = []
  if (nextSchedule) infoItems.push({
    label: 'Khởi hành gần nhất',
    value: fmtDateShort(nextSchedule.departure_date),
    icon: <Calendar size={16} className="text-[#005BAA]" />,
  })
  if (duration) infoItems.push({
    label: 'Thời gian',
    value: duration,
    icon: <Clock size={16} className="text-[#005BAA]" />,
  })
  if (airlineLabel && airlineLabel !== '—') infoItems.push({
    label: 'Vận chuyển',
    value: airlineLabel,
    icon: <Plane size={16} className="text-[#005BAA]" />,
  })
  if (nextSchedule && slotsAvail !== null) infoItems.push({
    label: 'Chỗ còn',
    value: slotsAvail === 0 ? 'Hết chỗ' : `${slotsAvail} chỗ`,
    icon: <Users size={16} className="text-[#005BAA]" />,
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6">

      {/* ── BREADCRUMB ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1 text-xs text-[#666666] flex-wrap">
        <Link href="/" className="hover:text-[#005BAA] transition-colors">Trang chủ</Link>
        <ChevronRight size={12} className="text-[#ccc]" />
        <Link href={`/${categorySlug}`} className="hover:text-[#005BAA] transition-colors">
          {categoryLabel}
        </Link>
        <ChevronRight size={12} className="text-[#ccc]" />
        <span className="text-[#1A1A2E] font-medium line-clamp-1">{tour.name}</span>
      </nav>

      {/* ── GALLERY (ảnh do admin upload) — ưu tiên hiển thị trên thumbnail ── */}
      {Array.isArray(tour.images) && tour.images.length > 0 ? (
        <ErrorBoundary moduleName="TourGallery">
          <TourGallery images={tour.images} tourName={tour.name} />
        </ErrorBoundary>
      ) : tour.thumbnail_url ? (
        /* ── Fallback: hero thumbnail đơn khi chưa có gallery ── */
        <div className="w-full h-52 sm:h-72 rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tour.thumbnail_url}
            alt={tour.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      {/* ── H1 + BADGES + USP ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {tour.category && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#F0F7FF] text-[#005BAA] border border-[#005BAA]/20">
              <Tag size={11} />
              {categoryLabel}
            </span>
          )}
          {duration && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-[#FF6B00] border border-[#FF6B00]/20">
              <Clock size={11} />
              {duration}
            </span>
          )}
          {destination && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-[#666666] border border-gray-200">
              <MapPin size={11} />
              {destination}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E] leading-tight">
          {tour.name}
        </h1>

        {/* USP: 3 highlights đầu inline */}
        {highlights.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {highlights.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#005BAA] font-bold text-sm shrink-0 mt-0.5">✓</span>
                <span className="text-sm text-[#444] leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── LEAD CAPTURE BOX ────────────────────────────────────────────────── */}
      <ErrorBoundary moduleName="TourLeadBox">
        <TourLeadBox tourCode={tour.code} tourName={tour.name} />
      </ErrorBoundary>

      {/* ── INFO BLOCK 4 Ô ──────────────────────────────────────────────────── */}
      {infoItems.length > 0 && (
        <div className={`grid gap-3 ${infoItems.length >= 3 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {infoItems.map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                {item.icon}
                <span className="text-[10px] text-[#999] uppercase tracking-wide font-medium">{item.label}</span>
              </div>
              <p className="text-sm font-semibold text-[#1A1A2E] leading-snug">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── GIÁ NỔI BẬT ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl px-5 py-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {minPrice !== null ? (
          <div>
            <p className="text-xs text-[#999] uppercase tracking-wide mb-0.5">Giá từ</p>
            <p className="text-3xl font-extrabold text-[#FF6B00]">{fmtVND(minPrice)}</p>
            <p className="text-xs text-[#666666] mt-0.5">/ người lớn</p>
          </div>
        ) : (
          <div>
            <p className="text-base font-semibold text-[#1A1A2E]">Liên hệ nhận giá tốt</p>
            <p className="text-xs text-[#666666]">Chưa có lịch khởi hành — đặt trước ưu tiên</p>
          </div>
        )}
        <a
          href="#section-schedule"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005BAA] text-white font-semibold text-sm rounded-xl hover:bg-[#0078D7] transition-colors whitespace-nowrap"
        >
          <Calendar size={15} />
          Xem lịch khởi hành
        </a>
      </div>

      {/* ── STICKY TAB NAV ──────────────────────────────────────────────────── */}
      <TourTabNav />

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: LỊCH TRÌNH TOUR
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="section-itinerary" className="scroll-mt-28 space-y-6">

        {/* Lịch trình chi tiết — Timeline */}
        {itinerary.length > 0 && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-5">Lịch trình chi tiết</h2>
            <TourTimeline days={itinerary} />
          </div>
        )}

        {/* Inclusions / Exclusions */}
        {(inclusions.length > 0 || exclusions.length > 0) && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Bao gồm / Không bao gồm</h2>
            <div className={`grid gap-6 ${inclusions.length > 0 && exclusions.length > 0 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
              {inclusions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#005BAA] uppercase tracking-wide mb-2.5">Bao gồm</p>
                  <ul className="space-y-2">
                    {inclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={15} className="text-[#005BAA] shrink-0 mt-0.5" />
                        <span className="text-sm text-[#1A1A2E]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {exclusions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2.5">Không bao gồm</p>
                  <ul className="space-y-2">
                    {exclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-[#1A1A2E]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Highlights đầy đủ (nếu > 3) */}
        {highlights.length > 3 && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Điểm nổi bật</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {highlights.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-[#005BAA] shrink-0 mt-0.5" />
                  <span className="text-sm text-[#1A1A2E] leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: BẢNG GIÁ & NGÀY KHỞI HÀNH
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="section-schedule" className="scroll-mt-28 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar size={18} className="text-[#005BAA]" />
          <h2 className="text-lg font-bold text-[#1A1A2E]">Bảng giá & Ngày khởi hành</h2>
        </div>

        {schedules.length > 0 ? (
          <>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F0F7FF]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#005BAA] uppercase tracking-wide">Ngày đi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#005BAA] uppercase tracking-wide">Ngày về</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#005BAA] uppercase tracking-wide">
                      <span className="flex items-center gap-1"><Plane size={12} />Chuyến bay</span>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#005BAA] uppercase tracking-wide">Người lớn</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#005BAA] uppercase tracking-wide">Trẻ em</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#005BAA] uppercase tracking-wide">Chỗ còn</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schedules.map(s => {
                    const { text: slotText, cls: slotCls } = slotsLabel(s)
                    const isFull = slotText === 'Hết chỗ'
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-[#1A1A2E] whitespace-nowrap">{fmtDate(s.departure_date)}</td>
                        <td className="px-4 py-3 text-[#666666] whitespace-nowrap">{fmtDate(s.return_date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {s.flight_code_departure
                            ? <span className="text-xs text-[#444]">{airlineName(s.flight_code_departure)}</span>
                            : <span className="text-xs text-[#999]">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#FF6B00] whitespace-nowrap">{fmtVND(s.price_adult)}</td>
                        <td className="px-4 py-3 text-right text-[#666666] whitespace-nowrap">
                          {s.price_child > 0 ? fmtVND(s.price_child) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right text-xs whitespace-nowrap ${slotCls}`}>{slotText}</td>
                        <td className="px-4 py-3 text-center">
                          <BookingScheduleButton
                            schedule={s}
                            tourId={tour.id}
                            tourName={tour.name}
                            disabled={isFull}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: card per schedule */}
            <div className="md:hidden divide-y divide-gray-100">
              {schedules.map(s => {
                const { text: slotText, cls: slotCls } = slotsLabel(s)
                const isFull = slotText === 'Hết chỗ'
                return (
                  <div key={s.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div>
                        <p className="text-[10px] text-[#999] uppercase tracking-wide">Ngày đi</p>
                        <p className="font-semibold text-[#1A1A2E] text-sm">{fmtDateShort(s.departure_date)}</p>
                      </div>
                      <span className="text-[#ccc] text-lg">→</span>
                      <div>
                        <p className="text-[10px] text-[#999] uppercase tracking-wide">Ngày về</p>
                        <p className="font-semibold text-[#1A1A2E] text-sm">{fmtDateShort(s.return_date)}</p>
                      </div>
                    </div>
                    {s.flight_code_departure && (
                      <div className="flex items-center gap-1.5 text-xs text-[#444]">
                        <Plane size={12} className="text-[#005BAA]" />
                        {airlineName(s.flight_code_departure)}
                      </div>
                    )}
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] text-[#999] uppercase tracking-wide">Người lớn</p>
                        <p className="font-bold text-[#FF6B00] text-base">{fmtVND(s.price_adult)}</p>
                      </div>
                      {s.price_child > 0 && (
                        <div>
                          <p className="text-[10px] text-[#999] uppercase tracking-wide">Trẻ em</p>
                          <p className="font-semibold text-[#666666] text-sm">{fmtVND(s.price_child)}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${slotCls}`}>{slotText}</span>
                      <BookingScheduleButton
                        schedule={s}
                        tourId={tour.id}
                        tourName={tour.name}
                        disabled={isFull}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="px-5 sm:px-6 py-8 text-center space-y-4">
            <p className="text-[#666666] text-sm">Liên hệ để nhận lịch khởi hành sớm nhất</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => lead.open(destination ?? undefined)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF6B00] text-white font-semibold text-sm rounded-xl hover:bg-orange-600 transition-colors"
              >
                Nhận Tư Vấn Lịch Trình
              </button>
              <a
                href={`tel:${process.env.NEXT_PUBLIC_SALES_PHONE ?? '0932611933'}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-[#005BAA] text-[#005BAA] font-semibold text-sm rounded-xl hover:bg-[#F0F7FF] transition-colors"
              >
                <Phone size={14} />
                Gọi tư vấn
              </a>
            </div>
          </div>
        )}
      </section>

      {/* ── POLICIES ────────────────────────────────────────────────────────── */}
      {tour.policies && (
        <section className="bg-gray-50 rounded-2xl p-5 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-3">Điều khoản & Chính sách</h2>
          <div className="text-sm text-[#444] leading-relaxed whitespace-pre-line">
            {tour.policies}
          </div>
        </section>
      )}

      {/* ── TOUR CÙNG LOẠI ──────────────────────────────────────────────────── */}
      {relatedTours.length > 0 && (
        <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Tour cùng loại</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {relatedTours.map(t => {
              const href = t.slug ? `/tour/${t.slug}` : `/tour/${t.id}`
              const nights = t.duration_days && t.duration_days > 1 ? t.duration_days - 1 : null
              const durationLabel = t.duration_days
                ? (nights ? `${t.duration_days}N${nights}Đ` : `${t.duration_days} ngày`)
                : null
              return (
                <Link
                  key={t.id}
                  href={href}
                  className="group flex flex-col rounded-xl border border-gray-100 overflow-hidden hover:border-[#005BAA]/40 hover:shadow-md transition-all"
                >
                  {t.thumbnail_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={t.thumbnail_url}
                      alt={t.name}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-32 bg-[#F0F7FF] flex items-center justify-center">
                      <MapPin size={24} className="text-[#005BAA] opacity-30" />
                    </div>
                  )}
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <p className="text-sm font-semibold text-[#1A1A2E] line-clamp-2 group-hover:text-[#005BAA] transition-colors leading-snug">
                      {t.name}
                    </p>
                    {durationLabel && (
                      <p className="text-xs text-[#666666] flex items-center gap-1">
                        <Clock size={11} />
                        {durationLabel}
                      </p>
                    )}
                    <span className="mt-auto text-[11px] font-semibold text-[#005BAA] group-hover:underline">
                      Xem ngay →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── FLOATING CTA — sticky bottom ────────────────────────────────────── */}
      <div
        className="fixed bottom-4 left-0 right-0 flex justify-center z-30 pointer-events-none"
        aria-hidden="true"
      >
        <div className="flex gap-2.5 pointer-events-auto">
          <button
            onClick={() => lead.open(destination ?? undefined)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-[#005BAA] font-semibold text-sm rounded-full shadow-lg border border-[#005BAA]/30 hover:bg-[#F0F7FF] active:scale-[0.97] transition-all"
          >
            Tư vấn
          </button>
          <button
            onClick={() => setFloatingBookingOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#FF6B00] text-white font-bold text-sm rounded-full shadow-lg hover:bg-orange-600 active:scale-[0.97] transition-all"
          >
            <Calendar size={14} />
            Đặt ngay
          </button>
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      {floatingBookingOpen && schedules.length > 0 && (
        <ErrorBoundary moduleName="BookingModal">
          <BookingModal
            tourId={tour.id}
            tourName={tour.name}
            schedules={schedules}
            onClose={() => setFloatingBookingOpen(false)}
          />
        </ErrorBoundary>
      )}

      <ErrorBoundary moduleName="TripGenieLeadModal">
        <TripGenieLeadModal
          isOpen={lead.isOpen}
          onClose={lead.close}
          defaultDestination={lead.destination}
        />
      </ErrorBoundary>
    </div>
  )
}
