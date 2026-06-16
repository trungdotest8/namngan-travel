'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Plus, Minus, Phone, CheckCircle, Loader2 } from 'lucide-react'
import type { TourSchedule } from '@/types/tour.types'

interface Props {
  tourId:             string
  tourName:           string
  schedules:          TourSchedule[]
  onClose:            () => void
  initialScheduleId?: string
  initialAdults?:     number
  initialChildren?:   number
}

interface FormState {
  scheduleId: string
  adults:     number
  children:   number
  name:       string
  phone:      string
  email:      string
  notes:      string
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN') + ' ₫'
}

function Stepper({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[#1A1A2E]">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center
                     hover:border-[#005BAA] hover:text-[#005BAA] transition-colors
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center font-semibold text-[#1A1A2E]">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center
                     hover:border-[#005BAA] hover:text-[#005BAA] transition-colors
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

export default function BookingModal({ tourId, tourName, schedules, onClose, initialScheduleId, initialAdults, initialChildren }: Props) {
  const openSchedules = schedules.filter(s => s.status === 'open')

  const [form, setForm] = useState<FormState>({
    scheduleId: initialScheduleId ?? openSchedules[0]?.id ?? '',
    adults:     initialAdults ?? 1,
    children:   initialChildren ?? 0,
    name:       '',
    phone:      '',
    email:      '',
    notes:      '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const selectedSchedule = openSchedules.find(s => s.id === form.scheduleId)
  const totalPrice = selectedSchedule
    ? form.adults * selectedSchedule.price_adult + form.children * selectedSchedule.price_child
    : 0

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Vui lòng nhập họ tên'
    if (!/^(0|\+84)[0-9]{8,10}$/.test(form.phone)) errs.phone = 'Số điện thoại không hợp lệ'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email không hợp lệ'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const scheduleLabel = selectedSchedule
      ? `Lịch: ${fmtDate(selectedSchedule.departure_date)}`
      : 'Lịch: chưa chọn'
    const message = [
      `Đặt tour: ${tourName}`,
      scheduleLabel,
      `Người lớn: ${form.adults}`,
      form.children > 0 ? `Trẻ em: ${form.children}` : null,
      totalPrice > 0 ? `Tổng dự kiến: ${fmtVND(totalPrice)}` : null,
      form.notes ? `Ghi chú: ${form.notes}` : null,
    ].filter(Boolean).join(' | ')

    try {
      const res = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:   form.name.trim(),
          phone:       form.phone,
          email:       form.email || undefined,
          message,
          tour_id:     tourId,
          lead_source: 'organic',
          pax:         form.adults + form.children,
        }),
      })

      if (!res.ok) throw new Error('submit_failed')
      setDone(true)
    } catch {
      setErrors({ phone: 'Có lỗi xảy ra. Vui lòng thử lại hoặc gọi hotline.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-xs text-[#005BAA] font-semibold uppercase tracking-wide mb-0.5">Đặt tour</p>
            <h2 className="text-base font-bold text-[#1A1A2E] line-clamp-2 max-w-[calc(100%-2rem)]">
              {tourName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-[#666666]"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {done ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={36} className="text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A2E] mb-1">Đặt tour thành công!</p>
              <p className="text-sm text-[#666666]">
                Chúng tôi sẽ liên hệ xác nhận trong vòng 30 phút.
              </p>
            </div>
            <a
              href="tel:0932611933"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005BAA] text-white text-sm font-semibold rounded-full hover:bg-[#0078D7] transition-colors"
            >
              <Phone size={14} />
              Gọi ngay: 0932 611 933
            </a>
            <button
              onClick={onClose}
              className="text-sm text-[#666666] hover:text-[#1A1A2E] transition-colors"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
            <div className="px-5 py-4 space-y-5">

              {/* Schedule selector */}
              {openSchedules.length > 0 ? (
                <div>
                  <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wide mb-2">
                    Chọn lịch khởi hành
                  </label>
                  <div className="space-y-2">
                    {openSchedules.map(s => {
                      const seatsLeft = s.seats_total - s.seats_booked
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            form.scheduleId === s.id
                              ? 'border-[#005BAA] bg-[#F0F7FF]'
                              : 'border-gray-200 hover:border-[#005BAA]/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="schedule"
                            value={s.id}
                            checked={form.scheduleId === s.id}
                            onChange={() => set('scheduleId', s.id)}
                            className="accent-[#005BAA]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1A1A2E]">
                              {fmtDate(s.departure_date)}
                            </p>
                            <p className="text-xs text-[#666666]">
                              Từ {fmtVND(s.price_adult)}/người lớn
                              {s.price_child > 0 ? ` · ${fmtVND(s.price_child)}/trẻ em` : ''}
                            </p>
                          </div>
                          {seatsLeft <= 5 && seatsLeft > 0 && (
                            <span className="text-xs text-orange-600 font-medium shrink-0">
                              Còn {seatsLeft} chỗ
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  Hiện chưa có lịch khởi hành. Để lại thông tin để được tư vấn.
                </div>
              )}

              {/* Passengers */}
              <div>
                <p className="text-xs font-semibold text-[#666666] uppercase tracking-wide mb-1">
                  Số hành khách
                </p>
                <div className="divide-y divide-gray-100">
                  <Stepper label="Người lớn" value={form.adults}   min={1}  max={20} onChange={v => set('adults', v)} />
                  <Stepper label="Trẻ em"    value={form.children} min={0}  max={10} onChange={v => set('children', v)} />
                </div>
                {totalPrice > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-[#666666]">Dự kiến tổng</span>
                    <span className="text-base font-bold text-[#FF6B00]">{fmtVND(totalPrice)}</span>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div>
                <p className="text-xs font-semibold text-[#666666] uppercase tracking-wide mb-2">
                  Thông tin liên hệ
                </p>
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Họ và tên *"
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:border-[#005BAA] transition-colors ${
                        errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Số điện thoại *"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:border-[#005BAA] transition-colors ${
                        errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                  </div>
                  <input
                    type="email"
                    placeholder="Email (không bắt buộc)"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:border-[#005BAA] transition-colors ${
                      errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  <textarea
                    placeholder="Ghi chú (không bắt buộc)"
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:border-[#005BAA] transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit footer */}
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 shrink-0">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#005BAA] text-white font-semibold rounded-xl hover:bg-[#0078D7] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Đang gửi...</>
                ) : (
                  'Gửi yêu cầu đặt tour'
                )}
              </button>
              <p className="text-xs text-center text-[#666666] mt-2">
                Nhân viên sẽ liên hệ xác nhận trong vòng 30 phút
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
