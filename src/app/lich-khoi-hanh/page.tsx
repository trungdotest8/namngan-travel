'use client'

import { useEffect, useMemo, useState } from 'react'
import { Phone, Calendar, Users, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { useCalendarStore } from '@/store/calendar.store'
import type { TourSchedule } from '@/types'

// ── Country keyword map ───────────────────────────────────────────────────────

const COUNTRY_MAP: Record<string, string[]> = {
  'TRUNG QUỐC':  ['BẮC KINH','THƯỢNG HẢI','HẢI NAM','QUẾ LÂM','TRÙNG KHÁNH','ĐẠI LÝ','ĐẠI LÍ','THÂM QUYẾN','VŨ HÁN','TÂN CƯƠNG','AN THI','QUẢNG CHÂU','NAM KINH','TRƯƠNG GIA GIỚI','TÔ CHÂU'],
  'THÁI LAN':    ['BANGKOK','PATTAYA','CHIANG','NONG NOOCH'],
  'SINGAPORE':   ['SINGAPORE'],
  'HÀN QUỐC':   ['HÀN QUỐC','SEOUL','BUSAN','JEJU'],
  'NHẬT BẢN':   ['NHẬT BẢN','TOKYO','OSAKA','KYOTO','HOKKAIDO'],
  'HỒNG KÔNG':  ['HỒNG KÔNG','HONG KONG'],
  'ĐÀI LOAN':   ['ĐÀI LOAN','TAIPEI'],
  'MỸ':         ['MỸ','LOS ANGELES','NEW YORK','LAS VEGAS'],
  'CANADA':      ['CANADA'],
  'CHÂU ÂU':    ['CHÂU ÂU','PARIS','ROME','AMSTERDAM'],
  'ẤN ĐỘ':     ['ẤN ĐỘ'],
  'INDONESIA':   ['INDONESIA','BALI'],
  'CAMBODIA':    ['CAMBODIA','CAMPUCHIA','ANGKOR'],
  'LÀO':        ['LÀO','VIENTIANE'],
  'PHI LÝ':    ['PHILIPPINE','MANILA','CEBU'],
  'UAE':         ['UAE','DUBAI'],
  'VIỆT NAM':   ['ĐÀ NẴNG','HỘI AN','NHA TRANG','PHÚ QUỐC','HÀ NỘI','HỒ CHÍ MINH','SÀI GÒN','HUẾ','ĐÀ LẠT','SA PA','HẠ LONG'],
}

function deriveCountry(destination: string | null): string {
  if (!destination) return 'Khác'
  const upper = destination.toUpperCase()
  for (const [country, keywords] of Object.entries(COUNTRY_MAP)) {
    if (keywords.some((kw) => upper.includes(kw))) return country
  }
  return 'Khác'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + ' ₫'
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return `Tháng ${parseInt(m)}/${y}`
}

function seatsLeft(s: TourSchedule) {
  return Math.max(0, s.seats_total - s.seats_booked)
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LichKhoiHanhPage() {
  const { schedules, isLoading, error, fetchSchedules } = useCalendarStore()

  const [selectedCountry,  setSelectedCountry]  = useState<string | null>(null)
  const [selectedDest,     setSelectedDest]     = useState<string | null>(null)
  const [selectedMonth,    setSelectedMonth]    = useState<string | null>(null)

  useEffect(() => {
    fetchSchedules({ limit: 200 })
  }, [fetchSchedules])

  // ── Derived filter options ──────────────────────────────────────────────────

  const countries = useMemo(() => {
    const set = new Set<string>()
    schedules.forEach((s) => set.add(deriveCountry(s.tour?.destination ?? null)))
    return Array.from(set).sort()
  }, [schedules])

  const destinations = useMemo(() => {
    const set = new Set<string>()
    schedules.forEach((s) => {
      if (!selectedCountry || deriveCountry(s.tour?.destination ?? null) === selectedCountry) {
        if (s.tour?.destination) set.add(s.tour.destination)
      }
    })
    return Array.from(set).sort()
  }, [schedules, selectedCountry])

  const months = useMemo(() => {
    const set = new Set<string>()
    schedules.forEach((s) => {
      const match =
        (!selectedCountry || deriveCountry(s.tour?.destination ?? null) === selectedCountry) &&
        (!selectedDest    || s.tour?.destination === selectedDest)
      if (match) set.add(s.departure_date.slice(0, 7))
    })
    return Array.from(set).sort()
  }, [schedules, selectedCountry, selectedDest])

  // ── Filtered rows ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedCountry && deriveCountry(s.tour?.destination ?? null) !== selectedCountry) return false
      if (selectedDest    && s.tour?.destination !== selectedDest) return false
      if (selectedMonth   && !s.departure_date.startsWith(selectedMonth)) return false
      return true
    })
  }, [schedules, selectedCountry, selectedDest, selectedMonth])

  // ── Filter change handlers ──────────────────────────────────────────────────

  function pickCountry(c: string) {
    setSelectedCountry((prev) => (prev === c ? null : c))
    setSelectedDest(null)
    setSelectedMonth(null)
  }
  function pickDest(d: string) {
    setSelectedDest((prev) => (prev === d ? null : d))
    setSelectedMonth(null)
  }
  function pickMonth(m: string) {
    setSelectedMonth((prev) => (prev === m ? null : m))
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Header />

      <main className="bg-gray-50 min-h-screen">
        {/* Page title */}
        <div className="bg-brand-blue text-white py-8">
          <div className="container-main">
            <h1 className="text-2xl font-bold">Lịch Khởi Hành</h1>
            <p className="text-blue-200 text-sm mt-1">
              Tra cứu lịch khởi hành tour — cập nhật từ hệ thống SeaStar International
            </p>
          </div>
        </div>

        <div className="container-main py-6 space-y-5">

          {/* ── Error ── */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => fetchSchedules({ limit: 200 })}
                className="ml-auto flex items-center gap-1 text-sm font-medium hover:underline"
              >
                <RefreshCw size={14} /> Thử lại
              </button>
            </div>
          )}

          {/* ── Bước 1: Chọn quốc gia ── */}
          <FilterBlock step={1} title="Chọn quốc gia" loading={isLoading && countries.length === 0}>
            <div className="flex flex-wrap gap-2">
              {countries.map((c) => (
                <FilterBtn
                  key={c}
                  label={c}
                  active={selectedCountry === c}
                  onClick={() => pickCountry(c)}
                />
              ))}
            </div>
          </FilterBlock>

          {/* ── Bước 2: Chọn điểm đến ── */}
          <FilterBlock step={2} title="Chọn điểm đến" loading={isLoading && destinations.length === 0}>
            {destinations.length === 0 && !isLoading ? (
              <p className="text-sm text-gray-400 italic">Chọn quốc gia để xem điểm đến</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {destinations.map((d) => (
                  <FilterBtn
                    key={d}
                    label={d}
                    active={selectedDest === d}
                    onClick={() => pickDest(d)}
                  />
                ))}
              </div>
            )}
          </FilterBlock>

          {/* ── Bước 3: Chọn tháng ── */}
          <FilterBlock step={3} title="Chọn tháng" loading={false}>
            {months.length === 0 && !isLoading ? (
              <p className="text-sm text-gray-400 italic">Chọn điểm đến để xem tháng</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {months.map((m) => (
                  <FilterBtn
                    key={m}
                    label={monthLabel(m)}
                    active={selectedMonth === m}
                    onClick={() => pickMonth(m)}
                  />
                ))}
              </div>
            )}
          </FilterBlock>

          {/* ── Giá note ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
            <span>✈</span>
            <span>
              <strong>GHI CHÚ GIÁ TOUR:</strong> ADL: Người lớn | CHD: Trẻ em (2–10 tuổi) | INF: Em bé (dưới 2 tuổi)
            </span>
          </div>

          {/* ── Bảng lịch khởi hành ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 font-semibold text-text-primary">
                <Calendar size={18} className="text-brand-blue" />
                <span>Lịch khởi hành</span>
                {!isLoading && (
                  <span className="text-xs font-normal text-gray-400">
                    ({filtered.length} chuyến)
                  </span>
                )}
              </div>
              <button
                onClick={() => fetchSchedules({ limit: 200 })}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-blue transition-colors"
              >
                <RefreshCw size={13} /> Làm mới
              </button>
            </div>

            {/* Loading skeleton */}
            {isLoading && (
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 px-4 py-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/5" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!isLoading && filtered.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Calendar size={40} className="mb-3 opacity-40" />
                <p className="font-medium">Không tìm thấy lịch khởi hành</p>
                <p className="text-sm mt-1">Vui lòng thay đổi bộ lọc hoặc liên hệ tư vấn</p>
              </div>
            )}

            {/* Table */}
            {!isLoading && filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      <th className="px-4 py-3 min-w-[200px]">Tên tour</th>
                      <th className="px-4 py-3 min-w-[180px]">Ngày đi / về</th>
                      <th className="px-4 py-3 min-w-[160px]">Giá tour</th>
                      <th className="px-4 py-3 text-center min-w-[80px]">Còn nhận</th>
                      <th className="px-4 py-3 text-center min-w-[80px]">Giữ chỗ</th>
                      <th className="px-4 py-3 text-center min-w-[90px]">Lịch trình</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((s) => {
                      const left = seatsLeft(s)
                      const isFull = s.status === 'full' || left === 0
                      return (
                        <tr key={s.id} className="hover:bg-brand-bg transition-colors">
                          {/* Tên tour */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-text-primary leading-snug">
                              {s.tour?.name ?? '—'}
                            </div>
                            {s.tour?.destination && (
                              <div className="text-xs text-gray-500 mt-0.5">{s.tour.destination}</div>
                            )}
                          </td>

                          {/* Ngày đi / về */}
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-xs">
                              <span className="font-medium text-brand-blue">Đi:</span>
                              {formatDate(s.departure_date)}
                            </div>
                            <div className="flex items-center gap-1 text-xs mt-0.5">
                              <span className="font-medium text-gray-400">Về:</span>
                              {formatDate(s.return_date)}
                            </div>
                            {s.transport && (
                              <div className="text-xs text-gray-400 mt-0.5 capitalize">{s.transport}</div>
                            )}
                          </td>

                          {/* Giá tour */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-xs space-y-0.5">
                              <div>
                                <span className="text-gray-500">ADL: </span>
                                <span className="font-semibold text-brand-accent">{formatVND(s.price_adult)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">CHD: </span>
                                <span className="font-medium text-gray-700">{formatVND(s.price_child)}</span>
                              </div>
                            </div>
                          </td>

                          {/* Còn nhận */}
                          <td className="px-4 py-3 text-center">
                            {isFull ? (
                              <span className="inline-block px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                                Hết chỗ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                                <Users size={13} />
                                {left}
                              </span>
                            )}
                          </td>

                          {/* Giữ chỗ */}
                          <td className="px-4 py-3 text-center">
                            <a
                              href="tel:0932611933"
                              className={[
                                'inline-block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                                isFull
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                                  : 'bg-brand-blue text-white hover:bg-light-blue',
                              ].join(' ')}
                            >
                              Giữ chỗ
                            </a>
                          </td>

                          {/* Lịch trình */}
                          <td className="px-4 py-3 text-center">
                            <a
                              href={`/tours/${s.tour?.slug ?? s.tour_id}`}
                              className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline font-medium"
                            >
                              Chi tiết <ChevronRight size={12} />
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom CTA bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="tel:0932611933"
              className="flex items-center justify-center gap-2 bg-brand-blue text-white font-semibold py-3.5 rounded-xl hover:bg-light-blue transition-colors"
            >
              <Phone size={18} />
              GIỮ CHỖ NGAY
            </a>
            <a
              href="https://zalo.me/0932611933"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-brand-accent text-white font-semibold py-3.5 rounded-xl hover:bg-orange-600 transition-colors"
            >
              <ChevronRight size={18} />
              TƯ VẤN ZALO
            </a>
            <a
              href="/lien-he"
              className="flex items-center justify-center gap-2 bg-gray-700 text-white font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Calendar size={18} />
              ĐỊA CHỈ CÔNG TY
            </a>
          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterBlock({
  step,
  title,
  loading,
  children,
}: {
  step: number
  title: string
  loading: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center shrink-0">
          {step}
        </span>
        <h2 className="font-semibold text-text-primary">Bước {step}: {title}</h2>
      </div>
      {loading ? (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

function FilterBtn({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
        active
          ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
          : 'bg-white text-gray-700 border-gray-300 hover:border-brand-blue hover:text-brand-blue',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
