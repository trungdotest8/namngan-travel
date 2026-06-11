'use client'

import { useState } from 'react'
import {
  CheckCircle, XCircle, ChevronDown, Calendar, Phone,
  ArrowLeft, MapPin, Clock, Tag,
} from 'lucide-react'
import Link from 'next/link'
import BookingModal from '@/components/booking/BookingModal'
import { TripGenieLeadModal, useTripGenieModal } from '@/components/booking/TripGenieLeadModal'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { Tour, TourSchedule } from '@/types/tour.types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtVND(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDuration(days: number | null): string {
  if (!days || days <= 0) return ''
  const nights = days - 1
  return nights <= 0 ? `${days} ngày` : `${days}N${nights}Đ`
}

// highlights là TEXT trong DB — có thể chứa JSON array hoặc plain text
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
      // fall through to line split
    }
  }
  return trimmed
    .split('\n')
    .map(s => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  tour:      Tour
  schedules: TourSchedule[]
}

export default function TourDetailClient({ tour, schedules }: Props) {
  const [bookingOpen,     setBookingOpen]     = useState(false)
  const [selectedSchedId, setSelectedSchedId] = useState<string | null>(null)
  const [openDays,        setOpenDays]        = useState<Record<number, boolean>>({})
  const lead = useTripGenieModal()

  // ── Derived data ─────────────────────────────────────────────────────────────
  const highlights  = parseHighlights(tour.highlights)
  const inclusions  = (tour.inclusions ?? []).filter(Boolean)
  const exclusions  = (tour.exclusions ?? []).filter(Boolean)
  const itinerary   = Array.isArray(tour.itinerary) ? tour.itinerary : []
  const destination = tour.destination ?? tour.country ?? null
  const category    = tour.category === 'trong nước' ? 'Trong nước'
                    : tour.category === 'nước ngoài' ? 'Nước ngoài'
                    : (tour.category ?? null)
  const duration    = formatDuration(tour.duration_days)

  // Put selected schedule first so BookingModal pre-selects it
  const sortedSchedules: TourSchedule[] = selectedSchedId
    ? [
        ...schedules.filter(s => s.id === selectedSchedId),
        ...schedules.filter(s => s.id !== selectedSchedId),
      ]
    : schedules

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function openBooking(scheduleId?: string) {
    setSelectedSchedId(scheduleId ?? null)
    setBookingOpen(true)
  }

  function closeBooking() {
    setBookingOpen(false)
    setSelectedSchedId(null)
  }

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
        {/* Thumbnail — ẩn nếu không có */}
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

          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E] leading-tight">
            {tour.name}
          </h1>

          {/* Summary — ẩn nếu null */}
          {tour.summary && (
            <p className="text-[#666666] text-base leading-relaxed">{tour.summary}</p>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={() => lead.open(destination ?? undefined)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#005BAA] text-white font-semibold rounded-xl hover:bg-[#0078D7] active:scale-[0.98] transition-all text-sm"
            >
              Nhận tư vấn miễn phí
            </button>
            {schedules.length > 0 && (
              <button
                onClick={() => openBooking()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#FF6B00] text-white font-semibold rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all text-sm"
              >
                <Calendar size={15} />
                Đặt tour ngay
              </button>
            )}
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
                <CheckCircle size={17} className="text-[#005BAA] shrink-0 mt-0.5" />
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
                        {day.title ?? `Ngày ${day.day}`}
                      </span>
                    </div>
                    <ChevronDown
                      size={17}
                      className={`text-[#666666] shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 pt-1 space-y-3">
                      {/* Meals badges — nếu có */}
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
                      {/* Content: whitespace-pre-line giữ dấu xuống dòng từ crawler */}
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
                <p className="text-xs font-semibold text-[#005BAA] uppercase tracking-wide mb-2.5">
                  Bao gồm
                </p>
                <ul className="space-y-2">
                  {inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle size={15} className="text-[#005BAA] shrink-0 mt-0.5" />
                      <span className="text-sm text-[#1A1A2E]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {exclusions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2.5">
                  Không bao gồm
                </p>
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

      {/* ── LỊCH KHỞI HÀNH ──────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar size={18} className="text-[#005BAA]" />
          <h2 className="text-lg font-bold text-[#1A1A2E]">Lịch khởi hành</h2>
        </div>

        {schedules.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-[#F0F7FF]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#005BAA] uppercase tracking-wide">
                    Ngày đi
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#005BAA] uppercase tracking-wide">
                    Người lớn
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#005BAA] uppercase tracking-wide">
                    Trẻ em
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#005BAA] uppercase tracking-wide">
                    Chỗ còn
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schedules.map(s => {
                  const available = Math.max(
                    0,
                    (s.seats_total ?? 0) - (s.seats_booked ?? 0)
                  )
                  const almostFull = available > 0 && available <= 5
                  const isFull     = available === 0

                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1A1A2E] whitespace-nowrap">
                        {fmtDate(s.departure_date)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#FF6B00] whitespace-nowrap">
                        {fmtVND(s.price_adult)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#666666] whitespace-nowrap">
                        {s.price_child > 0 ? fmtVND(s.price_child) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isFull ? (
                          <span className="text-xs font-medium text-red-500">Hết chỗ</span>
                        ) : almostFull ? (
                          <span className="text-xs font-medium text-orange-500">
                            Còn {available} chỗ
                          </span>
                        ) : (
                          <span className="text-xs text-[#666666]">{available} chỗ</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openBooking(s.id)}
                          disabled={isFull}
                          className="px-3 py-1.5 bg-[#005BAA] text-white text-xs font-semibold rounded-lg hover:bg-[#0078D7] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Đăng ký
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Không có lịch — CTA liên hệ */
          <div className="px-5 sm:px-6 py-8 text-center space-y-4">
            <p className="text-[#666666] text-sm">
              Liên hệ để biết lịch khởi hành gần nhất
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => lead.open(destination ?? undefined)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#005BAA] text-white font-semibold text-sm rounded-xl hover:bg-[#0078D7] transition-colors"
              >
                Nhận tư vấn
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
        <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-3">Điều khoản & Chính sách</h2>
          <div className="text-sm text-[#444] leading-relaxed whitespace-pre-line">
            {tour.policies}
          </div>
        </section>
      )}

      {/* ── FLOATING CTA — mobile sticky ────────────────────────────────────── */}
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
            onClick={() => openBooking()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#FF6B00] text-white font-bold text-sm rounded-full shadow-lg hover:bg-orange-600 active:scale-[0.97] transition-all"
          >
            <Calendar size={14} />
            Đặt ngay
          </button>
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      {bookingOpen && (
        <ErrorBoundary moduleName="BookingModal">
          <BookingModal
            tourId={tour.id}
            tourName={tour.name}
            schedules={sortedSchedules}
            onClose={closeBooking}
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
