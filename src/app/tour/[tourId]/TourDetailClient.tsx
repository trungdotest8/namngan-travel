'use client'

import { useState, useEffect, useRef } from 'react'
import { z } from 'zod'
import {
  CheckCircle2, XCircle, Calendar, Phone,
  MapPin, Clock, Tag, Plane, ChevronRight, Loader2, UtensilsCrossed,
} from 'lucide-react'
import Link from 'next/link'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import TourGallery from '@/components/tour/TourGallery'
import TourBookingWidget from '@/components/tour/TourBookingWidget'
import ItineraryNav from '@/components/tour/ItineraryNav'
import BookingModal from '@/components/booking/BookingModal'
import { TripGenieLeadModal, useTripGenieModal } from '@/components/booking/TripGenieLeadModal'
import BookingScheduleButton from '@/components/tour/BookingScheduleButton'
import type { Tour, TourSchedule } from '@/types/tour.types'

// ── Named export preserved (page.tsx imports this) ─────────────────────────────
export interface RelatedTour {
  id:            string
  slug:          string | null
  name:          string
  duration_days: number | null
  thumbnail_url: string | null
  category:      string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtVND(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit',
  })
}

function formatDuration(days: number | null): string {
  if (!days || days <= 0) return ''
  const nights = days - 1
  return nights <= 0 ? `${days} ngày` : `${days}N${nights}Đ`
}

const AIRLINE_MAP: Record<string, string> = {
  VN: 'Vietnam Airlines', VJ: 'Vietjet Air', QH: 'Bamboo Airways',
  BL: 'Pacific Airlines', VU: 'Vietravel Airlines', TH: 'Viettravel Airlines',
  FD: 'AirAsia', QW: 'Qingdao Airlines', CZ: 'China Southern',
  MF: 'Xiamen Air', MU: 'China Eastern', CA: 'Air China',
}

function airlineName(code: string | null): string {
  if (!code) return ''
  const prefix = code.split('-')[0]?.toUpperCase() ?? ''
  return AIRLINE_MAP[prefix] ? `${AIRLINE_MAP[prefix]} (${code})` : code
}

function slotsLabel(s: TourSchedule): { text: string; cls: string } {
  const avail = Math.max(0, (s.seats_total ?? 0) - (s.seats_booked ?? 0))
  if (avail === 0) return { text: 'Hết chỗ', cls: 'text-red-500 font-medium' }
  if (avail <= 5)  return { text: `Còn ${avail} chỗ`, cls: 'text-orange-500 font-medium' }
  return { text: `${avail} chỗ`, cls: 'text-[#666666]' }
}

function parseHighlights(raw: string | null): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string').filter(Boolean)
    } catch { /* fall through */ }
  }
  return trimmed.split('\n').map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
}

// ── Zod schema for footer lead form ───────────────────────────────────────────

const FooterLeadSchema = z.object({
  full_name: z.string().min(2, 'Vui lòng nhập họ tên'),
  phone:     z.string().regex(/^(0|\+84)[0-9]{8,10}$/, 'SĐT không hợp lệ (đầu 0 hoặc +84)'),
  email:     z.union([z.literal(''), z.string().email('Email không hợp lệ')]),
  pax:       z.number({ invalid_type_error: 'Số khách phải là số' }).min(1, 'Tối thiểu 1 khách').max(200),
  message:   z.string().optional(),
})
type FooterLeadFields = z.infer<typeof FooterLeadSchema>

// ── Footer Lead Form ───────────────────────────────────────────────────────────

type FooterFormState = Omit<FooterLeadFields, 'pax'> & { pax: number | '' }

function FooterLeadForm({ tourCode, tourName }: { tourCode: string; tourName: string }) {
  const [form, setForm] = useState<FooterFormState>({
    full_name: '', phone: '', email: '', pax: 2, message: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FooterLeadFields, string>>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  function set<K extends keyof FooterFormState>(k: K, v: FooterFormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k as keyof FooterLeadFields]; return n })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, pax: Number(form.pax) }
    const result  = FooterLeadSchema.safeParse(payload)
    if (!result.success) {
      const errs: Partial<Record<keyof FooterLeadFields, string>> = {}
      result.error.issues.forEach(i => {
        const k = i.path[0] as keyof FooterLeadFields
        if (!errs[k]) errs[k] = i.message
      })
      setErrors(errs)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:            result.data.full_name,
          phone:                result.data.phone,
          email:                result.data.email || undefined,
          pax:                  result.data.pax,
          message:              `[${tourCode}] ${tourName}${result.data.message ? ' — ' + result.data.message : ''}`,
          lead_source:          'organic',
          source_channel:       'web_form',
          destination_interest: tourName,
        }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        setErrors({ phone: 'Có lỗi xảy ra, vui lòng thử lại' })
      }
    } catch {
      setErrors({ phone: 'Không kết nối được, vui lòng thử lại' })
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-10 space-y-3">
        <CheckCircle2 size={40} className="mx-auto text-green-500" />
        <p className="text-lg font-bold text-[#1A1A2E]">Đã nhận yêu cầu!</p>
        <p className="text-sm text-[#666666]">Tư vấn viên sẽ liên hệ bạn trong 30 phút.</p>
      </div>
    )
  }

  const inp = (hasErr: boolean) =>
    `w-full px-4 py-2.5 rounded-xl border text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:border-[#005BAA] transition-colors ${hasErr ? 'border-red-400 bg-red-50' : 'border-gray-200'}`

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <input
            type="text" placeholder="Họ và tên *" value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            className={inp(!!errors.full_name)}
          />
          {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
        </div>
        <div>
          <input
            type="tel" placeholder="Số điện thoại *" value={form.phone}
            onChange={e => set('phone', e.target.value)}
            className={inp(!!errors.phone)}
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <input
            type="email" placeholder="Email (không bắt buộc)" value={form.email}
            onChange={e => set('email', e.target.value)}
            className={inp(!!errors.email)}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        <div>
          <input
            type="number" placeholder="Số khách dự kiến *"
            value={form.pax === '' ? '' : form.pax}
            min={1} max={200}
            onChange={e => set('pax', e.target.value === '' ? '' : Number(e.target.value))}
            className={inp(!!errors.pax)}
          />
          {errors.pax && <p className="text-xs text-red-500 mt-1">{errors.pax}</p>}
        </div>
      </div>
      <textarea
        placeholder="Lời nhắn, yêu cầu đặc biệt..."
        value={form.message} rows={3}
        onChange={e => set('message', e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:border-[#005BAA] transition-colors resize-none"
      />
      <button
        type="submit" disabled={loading}
        className="w-full py-3.5 bg-[#005BAA] text-white font-bold text-sm rounded-xl hover:bg-[#0078D7] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 size={16} className="animate-spin" />Đang gửi...</> : 'Gửi Yêu Cầu Tư Vấn'}
      </button>
    </form>
  )
}

// ── Mobile Itinerary Nav (horizontal pills) ────────────────────────────────────

function MobileItineraryBar({ days }: { days: { day: number; title: string }[] }) {
  const [activeDay, setActiveDay] = useState(days[0]?.day ?? 1)
  const obsRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    obsRef.current?.disconnect()
    obsRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const n = parseInt(visible[0].target.id.replace('day-', ''), 10)
          if (!isNaN(n)) setActiveDay(n)
        }
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    )
    days.forEach(d => {
      const el = document.getElementById(`day-${d.day}`)
      if (el) obsRef.current!.observe(el)
    })
    return () => obsRef.current?.disconnect()
  }, [days])

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {days.map(d => (
        <button
          key={d.day}
          onClick={() => document.getElementById(`day-${d.day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className={[
            'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
            activeDay === d.day
              ? 'bg-[#005BAA] text-white'
              : 'bg-white text-[#666666] border border-gray-200 hover:border-[#005BAA] hover:text-[#005BAA]',
          ].join(' ')}
        >
          Ngày {d.day}
        </button>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  tour:         Tour
  schedules:    TourSchedule[]
  relatedTours: RelatedTour[]
}

export default function TourDetailClient({ tour, schedules, relatedTours }: Props) {
  const [bottomBarBookingOpen, setBottomBarBookingOpen] = useState(false)
  const [showBottomBar, setShowBottomBar]               = useState(false)
  const heroEndRef = useRef<HTMLDivElement>(null)
  const lead = useTripGenieModal()

  // Show mobile bottom bar after scrolling past hero
  useEffect(() => {
    const el = heroEndRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setShowBottomBar(!entry.isIntersecting),
      { threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const highlights  = parseHighlights(tour.highlights)
  const inclusions  = Array.isArray(tour.inclusions) ? tour.inclusions.filter(Boolean) : []
  const exclusions  = Array.isArray(tour.exclusions) ? tour.exclusions.filter(Boolean) : []
  const itinerary   = Array.isArray(tour.itinerary) ? tour.itinerary : []
  const hasItinerary = itinerary.length > 0
  const hasImages   = Array.isArray(tour.images) && tour.images.length > 0
  const destination = tour.destination ?? tour.country ?? null

  const categorySlug  = tour.category === 'trong nước' ? 'tour-trong-nuoc'
                      : tour.category === 'nước ngoài'  ? 'tour-nuoc-ngoai'
                      : 'tours'
  const categoryLabel = tour.category === 'trong nước' ? 'Tour Trong Nước'
                      : tour.category === 'nước ngoài'  ? 'Tour Nước Ngoài'
                      : (tour.category ?? 'Tour')
  const duration      = formatDuration(tour.duration_days)

  const nextSchedule   = schedules[0] ?? null
  const minPrice       = schedules.length > 0 ? Math.min(...schedules.map(s => s.price_adult)) : null
  const airlineLabel   = nextSchedule?.flight_code_departure ? airlineName(nextSchedule.flight_code_departure) : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24 space-y-8">

      {/* ── BREADCRUMB ────────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1 text-xs text-[#666666] flex-wrap">
        <Link href="/" className="hover:text-[#005BAA] transition-colors">Trang chủ</Link>
        <ChevronRight size={12} className="text-[#ccc]" />
        <Link href={`/${categorySlug}`} className="hover:text-[#005BAA] transition-colors">
          {categoryLabel}
        </Link>
        <ChevronRight size={12} className="text-[#ccc]" />
        <span className="text-[#1A1A2E] font-medium line-clamp-1">{tour.name}</span>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          KHỐI 1 — HERO: Gallery (65%) + Booking Widget (35%)
          ══════════════════════════════════════════════════════════════════ */}
      <div className="grid md:[grid-template-columns:65%_35%] gap-6 items-start">

        {/* LEFT: Gallery → H1 → Badges → Highlights */}
        <div className="space-y-5 min-w-0">
          {hasImages ? (
            <ErrorBoundary moduleName="TourGallery">
              <TourGallery images={tour.images!} tourName={tour.name} />
            </ErrorBoundary>
          ) : tour.thumbnail_url ? (
            <div className="w-full h-56 sm:h-72 rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tour.thumbnail_url} alt={tour.name} className="w-full h-full object-cover" />
            </div>
          ) : null}

          {/* H1 */}
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E] leading-tight">
            {tour.name}
          </h1>

          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            {tour.code && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#F0F7FF] text-[#005BAA] border border-[#005BAA]/20">
                <Tag size={11} />
                {tour.code}
              </span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-[#FF6B00] border border-[#FF6B00]/20">
                <Clock size={11} />
                {duration}
              </span>
            )}
            {nextSchedule && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-[#666666] border border-gray-200">
                <Calendar size={11} />
                Khởi hành {fmtDateShort(nextSchedule.departure_date)}
              </span>
            )}
            {airlineLabel && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-[#666666] border border-gray-200">
                <Plane size={11} />
                {airlineLabel}
              </span>
            )}
            {destination && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-[#666666] border border-gray-200">
                <MapPin size={11} />
                {destination}
              </span>
            )}
          </div>

          {/* Highlights USP */}
          {highlights.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {highlights.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#005BAA] font-bold text-sm shrink-0 mt-0.5">✓</span>
                  <span className="text-sm text-[#444] leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Booking Widget — sticky on desktop, hidden on mobile */}
        <div className="hidden md:block md:sticky md:top-24">
          <ErrorBoundary moduleName="BookingWidget">
            <TourBookingWidget tour={tour} schedules={schedules} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Sentinel: when this exits viewport → show mobile bottom bar */}
      <div ref={heroEndRef} aria-hidden="true" className="h-0" />

      {/* ══════════════════════════════════════════════════════════════════════
          KHỐI 2 — SCROLLSPY ITINERARY (ẩn hoàn toàn nếu không có itinerary)
          ══════════════════════════════════════════════════════════════════ */}
      {hasItinerary && (
        <section id="section-itinerary" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-bold text-[#1A1A2E]">Lịch trình chi tiết</h2>

          {/* Mobile: horizontal day pills (NOT sticky, tránh chồng bottom bar) */}
          <div className="md:hidden">
            <MobileItineraryBar days={itinerary} />
          </div>

          <div className="grid md:[grid-template-columns:25%_75%] gap-6 items-start">

            {/* LEFT: Scrollspy nav — sticky on desktop */}
            <div className="hidden md:block md:sticky md:top-24">
              <ErrorBoundary moduleName="ItineraryNav">
                <ItineraryNav days={itinerary} />
              </ErrorBoundary>
            </div>

            {/* RIGHT: Day sections */}
            <div className="space-y-8 min-w-0">
              {itinerary.map(day => (
                <section
                  key={day.day}
                  id={`day-${day.day}`}
                  className="scroll-mt-24 bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm"
                >
                  {/* Day header */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="shrink-0 w-10 h-10 rounded-full bg-[#005BAA] text-white text-sm font-bold flex items-center justify-center">
                      {day.day}
                    </span>
                    <h3 className="text-base font-bold text-[#1A1A2E] leading-snug flex-1">
                      {day.title}
                    </h3>
                    {/* Meals badges */}
                    {Array.isArray(day.meals) && day.meals.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <UtensilsCrossed size={13} className="text-[#005BAA]" />
                        {day.meals.map((m, mi) => (
                          <span
                            key={mi}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F7FF] text-[#005BAA]"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <p className="whitespace-pre-line text-sm text-slate-600 leading-relaxed">
                    {day.description}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          KHỐI 3 — FOOTER: Inclusions/Exclusions + Lead Form
          ══════════════════════════════════════════════════════════════════ */}

      {/* Inclusions / Exclusions */}
      {(inclusions.length > 0 || exclusions.length > 0) && (
        <section className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Bao gồm / Không bao gồm</h2>
          <div className={`grid gap-6 ${inclusions.length > 0 && exclusions.length > 0 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
            {inclusions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2.5">
                  Bao gồm
                </p>
                <ul className="space-y-2">
                  {inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" />
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

      {/* Footer Lead Form */}
      <section id="section-contact" className="scroll-mt-20 bg-gray-50 rounded-2xl p-5 sm:p-8 border border-gray-200">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-1">Yêu cầu tư vấn miễn phí</h2>
          <p className="text-sm text-[#666666] mb-5">
            Để lại thông tin, tư vấn viên sẽ liên hệ trong 30 phút.
          </p>
          <ErrorBoundary moduleName="FooterLeadForm">
            <FooterLeadForm tourCode={tour.code} tourName={tour.name} />
          </ErrorBoundary>
        </div>
      </section>

      {/* ── BẢNG LỊCH KHỞI HÀNH ─────────────────────────────────────────────── */}
      <section id="section-schedule" className="scroll-mt-20 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar size={18} className="text-[#005BAA]" />
          <h2 className="text-lg font-bold text-[#1A1A2E]">Bảng giá & Ngày khởi hành</h2>
        </div>

        {schedules.length > 0 ? (
          <>
            {/* Desktop table */}
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
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-[#1A1A2E] whitespace-nowrap">{fmtDate(s.departure_date)}</td>
                        <td className="px-4 py-3 text-[#666666] whitespace-nowrap">{fmtDate(s.return_date)}</td>
                        <td className="px-4 py-3">
                          {s.flight_code_departure
                            ? <span className="text-xs text-[#444]">{airlineName(s.flight_code_departure)}</span>
                            : <span className="text-xs text-[#999]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#FF6B00] whitespace-nowrap">{fmtVND(s.price_adult)}</td>
                        <td className="px-4 py-3 text-right text-[#666666] whitespace-nowrap">
                          {s.price_child > 0 ? fmtVND(s.price_child) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right text-xs whitespace-nowrap ${slotCls}`}>{slotText}</td>
                        <td className="px-4 py-3 text-center">
                          <BookingScheduleButton
                            schedule={s} tourId={tour.id} tourName={tour.name}
                            disabled={slotText === 'Hết chỗ'}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {schedules.map(s => {
                const { text: slotText, cls: slotCls } = slotsLabel(s)
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
                        schedule={s} tourId={tour.id} tourName={tour.name}
                        disabled={slotText === 'Hết chỗ'}
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

      {/* ── POLICIES ─────────────────────────────────────────────────────────── */}
      {tour.policies && (
        <section className="bg-gray-50 rounded-2xl p-5 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-3">Điều khoản & Chính sách</h2>
          <div className="text-sm text-[#444] leading-relaxed whitespace-pre-line">
            {tour.policies}
          </div>
        </section>
      )}

      {/* ── TOUR CÙNG LOẠI ───────────────────────────────────────────────────── */}
      {relatedTours.length > 0 && (
        <section className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
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
                  key={t.id} href={href}
                  className="group flex flex-col rounded-xl border border-gray-100 overflow-hidden hover:border-[#005BAA]/40 hover:shadow-md transition-all"
                >
                  {t.thumbnail_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={t.thumbnail_url} alt={t.name} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
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

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE BOTTOM BAR — fixed, appears after scrolling past hero
          ══════════════════════════════════════════════════════════════════ */}
      <div
        className={[
          'md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]',
          'transition-transform duration-300',
          showBottomBar ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            {minPrice !== null ? (
              <div>
                <p className="text-[10px] text-[#999] uppercase tracking-wide leading-none mb-0.5">Giá từ</p>
                <p className="text-xl font-extrabold text-[#FF6B00] leading-none">{fmtVND(minPrice)}</p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-[#1A1A2E]">Liên hệ nhận giá</p>
            )}
          </div>
          {schedules.length > 0 ? (
            <button
              onClick={() => setBottomBarBookingOpen(true)}
              className="shrink-0 px-5 py-3 bg-[#FF6B00] text-white font-bold text-sm rounded-xl hover:bg-orange-600 active:scale-[0.97] transition-all"
            >
              ĐẶT TOUR NGAY
            </button>
          ) : (
            <button
              onClick={() => lead.open(destination ?? undefined)}
              className="shrink-0 px-5 py-3 bg-[#005BAA] text-white font-bold text-sm rounded-xl hover:bg-[#0078D7] active:scale-[0.97] transition-all"
            >
              Tư vấn ngay
            </button>
          )}
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────────── */}
      {bottomBarBookingOpen && schedules.length > 0 && (
        <ErrorBoundary moduleName="BookingModal">
          <BookingModal
            tourId={tour.id}
            tourName={tour.name}
            schedules={schedules}
            onClose={() => setBottomBarBookingOpen(false)}
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
