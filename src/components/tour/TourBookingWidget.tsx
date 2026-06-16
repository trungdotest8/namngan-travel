'use client'

import { useState } from 'react'
import { ChevronDown, Minus, Plus, Phone } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import BookingModal from '@/components/booking/BookingModal'
import { TripGenieLeadModal, useTripGenieModal } from '@/components/booking/TripGenieLeadModal'
import type { Tour, TourSchedule } from '@/types/tour.types'

interface Props {
  tour:      Tour
  schedules: TourSchedule[]
}

function fmtVND(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

function fmtDMY(d: string) {
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

function slots(s: TourSchedule) {
  return Math.max(0, (s.seats_total ?? 0) - (s.seats_booked ?? 0))
}

function StepperRow({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-[#1A1A2E]">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#005BAA] hover:text-[#005BAA] disabled:opacity-30 transition-colors"
        >
          <Minus size={13} />
        </button>
        <span className="w-6 text-center font-bold text-[#1A1A2E] text-sm">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#005BAA] hover:text-[#005BAA] disabled:opacity-30 transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

export default function TourBookingWidget({ tour, schedules }: Props) {
  const openSchedules = schedules.filter(s => s.status === 'open')
  const [selectedId, setSelectedId] = useState(openSchedules[0]?.id ?? '')
  const [adults, setAdults]         = useState(1)
  const [children, setChildren]     = useState(0)
  const [modalOpen, setModalOpen]   = useState(false)
  const lead = useTripGenieModal()

  const selected  = openSchedules.find(s => s.id === selectedId) ?? null
  const total     = selected
    ? adults * selected.price_adult + children * (selected.price_child ?? 0)
    : 0
  const hasOpen   = openSchedules.length > 0
  const salesPhone = process.env.NEXT_PUBLIC_SALES_PHONE ?? '0932611933'

  return (
    <ErrorBoundary moduleName="BookingWidget">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 space-y-4">

        {/* Price header */}
        {selected ? (
          <div className="pb-3 border-b border-gray-100">
            <p className="text-[11px] text-[#999] uppercase tracking-wide mb-0.5">Giá từ</p>
            <p className="text-3xl font-extrabold text-[#FF6B00] leading-none">
              {fmtVND(selected.price_adult)}
            </p>
            <p className="text-xs text-[#666666] mt-1">/ người lớn</p>
          </div>
        ) : (
          <div className="pb-3 border-b border-gray-100">
            <p className="font-semibold text-[#1A1A2E]">Liên hệ nhận giá tốt</p>
            <p className="text-xs text-[#666666] mt-0.5">Chưa có lịch — đặt trước ưu tiên</p>
          </div>
        )}

        {hasOpen ? (
          <>
            {/* Schedule dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-[#666666] uppercase tracking-wide mb-1.5">
                Chọn lịch khởi hành
              </label>
              <div className="relative">
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A1A2E] bg-white focus:outline-none focus:border-[#005BAA] transition-colors"
                >
                  {openSchedules.map(s => (
                    <option key={s.id} value={s.id}>
                      {fmtDMY(s.departure_date)} — còn {slots(s)} chỗ
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none"
                />
              </div>
            </div>

            {/* Steppers */}
            <div>
              <p className="text-[11px] font-semibold text-[#666666] uppercase tracking-wide mb-1">
                Số hành khách
              </p>
              <StepperRow label="Người lớn" value={adults}   min={1} max={20} onChange={setAdults} />
              <StepperRow label="Trẻ em"    value={children} min={0} max={10} onChange={setChildren} />
            </div>

            {/* Total */}
            {total > 0 && (
              <div className="flex items-center justify-between bg-[#FFF7F0] rounded-xl px-4 py-3">
                <span className="text-sm text-[#666666]">Tổng dự kiến</span>
                <span className="text-xl font-extrabold text-[#FF6B00]">{fmtVND(total)}</span>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={() => setModalOpen(true)}
              className="w-full py-3.5 bg-[#FF6B00] text-white font-bold text-base rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all shadow-sm"
            >
              ĐẶT TOUR NGAY
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#666666] text-center">
              Hiện chưa có lịch khởi hành đang mở.
            </p>
            <button
              onClick={() => lead.open(tour.destination ?? tour.country ?? undefined)}
              className="w-full py-3 bg-[#005BAA] text-white font-semibold text-sm rounded-xl hover:bg-[#0078D7] transition-colors"
            >
              Liên hệ nhận lịch mới
            </button>
            <a
              href={`tel:${salesPhone}`}
              className="flex items-center justify-center gap-2 py-2.5 border-2 border-[#005BAA] text-[#005BAA] font-semibold text-sm rounded-xl hover:bg-[#F0F7FF] transition-colors"
            >
              <Phone size={14} />
              Gọi tư vấn ngay
            </a>
          </div>
        )}

        {/* Note */}
        <p className="text-[11px] text-center text-[#999]">
          Nhân viên xác nhận trong 30 phút
        </p>
      </div>

      {/* Booking modal */}
      {modalOpen && (
        <ErrorBoundary moduleName="BookingModal">
          <BookingModal
            tourId={tour.id}
            tourName={tour.name}
            schedules={openSchedules}
            initialScheduleId={selectedId}
            initialAdults={adults}
            initialChildren={children}
            onClose={() => setModalOpen(false)}
          />
        </ErrorBoundary>
      )}

      {/* Lead modal (no schedule) */}
      <TripGenieLeadModal
        isOpen={lead.isOpen}
        onClose={lead.close}
        defaultDestination={lead.destination}
      />
    </ErrorBoundary>
  )
}
