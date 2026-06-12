'use client'

import { useState } from 'react'
import {
  CheckCircle2, XCircle, ChevronDown, Calendar, Phone,
  ArrowLeft, MapPin, Clock, Tag, Plane,
} from 'lucide-react'
import Link from 'next/link'
import BookingModal from '@/components/booking/BookingModal'
import { TripGenieLeadModal, useTripGenieModal } from '@/components/booking/TripGenieLeadModal'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import BookingScheduleButton from '@/components/tour/BookingScheduleButton'
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
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDuration(days: number | null): string {
  if (!days || days <= 0) return ''
  const nights = days - 1
  return nights <= 0 ? `${days} ngày` : `${days}N${nights}Đ`
}

// highlights là TEXT — có thể chứa JSON array hoặc plain text
function parseHighlights(raw: string | null): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string').filter(Boolean)
      }
    } catch {
      // fall through
    }
  }
  return trimmed
    .split('\n')
    .map(s => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
}

// Suy tên hãng hàng không từ prefix mã chuyến
function airlineName(code: string | null): string {
  if (!code) return '—'
  const prefix = code.split('-')[0]?.toUpperCase() ?? ''
  const map: Record<string, string> = {
    VN: 'Vietnam Airlines',
    VJ: 'Vietjet Air',
    QH: 'Bamboo Airways',
    BL: 'Pacific Airlines',
    VU: 'Vietravel Airlines',
    TH: 'Viettravel Airlines',
  }
  return map[prefix] ? `${map[prefix]} (${code})` : code
}

function slotsLabel(s: TourSchedule): { text: string; cls: string } {
  const avail = Math.max(0, (s.seats_total ?? 0) - (s.seats_booked ?? 0))
  if (avail === 0)  return { text: 'Hết chỗ', cls: 'text-red-500 font-medium' }
  if (avail <= 5)   return { text: `Còn ${avail} chỗ`, cls: 'text-orange-500 font-medium' }
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
  const [openDays, setOpenDays]                       = useState<Record<number, boolean>>({})
  const lead = useTripGenieModal()

  // ── Derived ──────────────────────────────────────────────────────────────────
  const highlights  = parseHighlights(tour.highlights)
  const inclusions  = (tour.inclusions ?? []).filter(Boolean)
  const exclusions  = (tour.exclusions ?? []).filter(Boolean)
  const itinerary   = Array.isArray(tour.itinerary) ? tour.itinerary : []
  const destination = tour.destination ?? tour.country ?? null
  const category    = tour.category === 'trong nước' ? 'Trong nước'
                    : tour.category === 'nước ngoài' ? 'Nước ngoài'
                    : (tour.category ?? null)
  const duration    = formatDuration(tour.duration_days)

  function toggleDay(idx: number) {
    setOpenDays(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6">

      {/* Breadcrumb */}
      <Link
        href="/tours"
        className="inline-flex items-center gap-1.5 text-sm text-[#666666] hover:text-[#005BAA] transition-colors"
      >
        <ArrowLeft size={15} />
        Danh sách tour
      </Link>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        {tour.thumbnail_url && (
          <div className="w-full h-56 sm:h-72 overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tour.thumbnail_url}
              alt={tour.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-4">
          {/* Badges */}
          {(category || duration || destination) && (
            <div className="flex flex-wrap gap-2">
              {category && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#F0F7FF] text-[#005BAA] border border-[#005BAA]/20">
                  <Tag size={11} />
                  {category}
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
          )}

          {/* h1 */}
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E] leading-tight">
            {tour.name}
          </h1>

          {/* Summary */}
          {tour.summary && (
            <p className="text-[#666666] text-base leading-relaxed">{tour.summary}</p>
          )}

          {/* CTA chính: orange "Nhận Tư Vấn Lịch Trình" */}
          <div className="pt-1">
            <button
              onClick={() => lead.open(destination ?? undefined)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FF6B00] text-white font-bold rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all text-sm shadow-md shadow-orange-200"
            >
              <Phone size={15} />
              Nhận Tư Vấn Lịch Trình
            </button>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS — ẩn nếu rỗng ────────────────────────────────────────── */}
      {highlights.length > 0 && (
        <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Điểm nổi bật</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {highlights.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 size={17} className="text-[#005BAA] shrink-0 mt-0.5" />
                <span className="text-sm text-[#1A1A2E] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── ITINERARY (Accordion) — ẩn nếu rỗng ────────────────────────────── */}
      {itinerary.length > 0 && (
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-[#1A1A2E]">Lịch trình chi tiết</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {itinerary.map((day, idx) => {
              const isOpen = !!openDays[idx]
              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => toggleDay(idx)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between px-5 sm:px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-[#005BAA] text-white text-xs font-bold flex items-center justify-center">
                        {day.day}
                      </span>
                      <span className="font-semibold text-[#1A1A2E] text-sm sm:text-base truncate">
                        {`Ngày ${day.day}: ${day.title ?? ''}`}
                      </span>
                    </div>
                    <ChevronDown
                      size={17}
                      className={`text-[#666666] shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 pt-1 space-y-3">
                      {day.meals && day.meals.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {day.meals.map(m => (
                            <span
                              key={m}
                              className="px-2 py-0.5 rounded-full bg-[#F0F7FF] text-[#005BAA] text-xs font-medium border border-[#005BAA]/20"
                            >
                              🍽 {m}
                            </span>
                          ))}
                        </div>
                      )}
                      {day.description && (
                        <p className="text-sm text-[#444] leading-relaxed whitespace-pre-line">
                          {day.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── INCLUSIONS / EXCLUSIONS — ẩn cột nào rỗng ──────────────────────── */}
      {(inclusions.length > 0 || exclusions.length > 0) && (
        <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
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
        </section>
      )}

      {/* ── LỊCH KHỞI HÀNH — luôn hiển thị ─────────────────────────────────── */}
      <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar size={18} className="text-[#005BAA]" />
          <h2 className="text-lg font-bold text-[#1A1A2E]">Lịch khởi hành</h2>
        </div>

        {schedules.length > 0 ? (
          <>
            {/* Desktop: table (md+) */}
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
                        <td className="px-4 py-3 font-medium text-[#1A1A2E] whitespace-nowrap">
                          {fmtDate(s.departure_date)}
                        </td>
                        <td className="px-4 py-3 text-[#666666] whitespace-nowrap">
                          {fmtDate(s.return_date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {s.flight_code_departure ? (
                            <span className="text-xs text-[#444]">{airlineName(s.flight_code_departure)}</span>
                          ) : (
                            <span className="text-xs text-[#999]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#FF6B00] whitespace-nowrap">
                          {fmtVND(s.price_adult)}
                        </td>
                        <td className="px-4 py-3 text-right text-[#666666] whitespace-nowrap">
                          {s.price_child > 0 ? fmtVND(s.price_child) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right text-xs whitespace-nowrap ${slotCls}`}>
                          {slotText}
                        </td>
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

            {/* Mobile: card per schedule (<md) */}
            <div className="md:hidden divide-y divide-gray-100">
              {schedules.map(s => {
                const { text: slotText, cls: slotCls } = slotsLabel(s)
                const isFull = slotText === 'Hết chỗ'
                return (
                  <div key={s.id} className="p-4 space-y-3">
                    {/* Dates */}
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

                    {/* Flight */}
                    {s.flight_code_departure && (
                      <div className="flex items-center gap-1.5 text-xs text-[#444]">
                        <Plane size={12} className="text-[#005BAA]" />
                        {airlineName(s.flight_code_departure)}
                      </div>
                    )}

                    {/* Price row */}
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

                    {/* Slots + Button */}
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
          /* Không có lịch open */
          <div className="px-5 sm:px-6 py-8 text-center space-y-4">
            <p className="text-[#666666] text-sm">
              Liên hệ để nhận lịch khởi hành sớm nhất
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => lead.open(destination ?? undefined)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF6B00] text-white font-semibold text-sm rounded-xl hover:bg-orange-600 transition-colors"
              >
                Nhận Tư Vấn Lịch Trình
              </button>
              <a
                href="tel:0932611933"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-[#005BAA] text-[#005BAA] font-semibold text-sm rounded-xl hover:bg-[#F0F7FF] transition-colors"
              >
                <Phone size={14} />
                Gọi: 0932 611 933
              </a>
            </div>
          </div>
        )}
      </section>

      {/* ── POLICIES — ẩn nếu null ───────────────────────────────────────────── */}
      {tour.policies && (
        <section className="bg-gray-50 rounded-2xl p-5 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-3">Điều khoản & Chính sách</h2>
          <div className="text-sm text-[#444] leading-relaxed whitespace-pre-line">
            {tour.policies}
          </div>
        </section>
      )}

      {/* ── TOUR CÙNG LOẠI — ẩn nếu không có ──────────────────────────────── */}
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
