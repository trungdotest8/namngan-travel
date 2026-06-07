'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, Send, MessageCircle } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { Button } from '@/components/ui/Button'
import { TripGenieLeadSchema, type TripGenieLeadInput } from '@/lib/validations/lead.schema'
import { ZodError } from 'zod'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TripGenieLeadModalProps {
  isOpen:              boolean
  onClose:             () => void
  defaultDestination?: string
}

type Step = 'form' | 'success'

type FormErrors = Partial<Record<keyof TripGenieLeadInput, string>>

const BUDGET_OPTIONS = [
  { value: 'under-5m', label: 'Dưới 5 triệu' },
  { value: '5-10m',    label: '5 – 10 triệu' },
  { value: '10-20m',   label: '10 – 20 triệu' },
  { value: 'over-20m', label: 'Trên 20 triệu' },
] as const

// ── Inner form (not wrapped in ErrorBoundary so EB can wrap the whole thing) ──

function ModalInner({ isOpen, onClose, defaultDestination }: TripGenieLeadModalProps) {
  const [step, setStep]       = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState<FormErrors>({})
  const [form, setForm]       = useState({
    full_name:            '',
    phone:                '',
    zalo_number:          '',
    email:                '',
    destination_interest: defaultDestination ?? '',
    budget:               '' as TripGenieLeadInput['budget'] | '',
    travel_date:          '',
    message:              '',
  })

  // Reset khi mở lại modal
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setErrors({})
      setLoading(false)
      setForm(prev => ({ ...prev, destination_interest: defaultDestination ?? prev.destination_interest }))
    }
  }, [isOpen, defaultDestination])

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const set = useCallback(<K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }, [])

  const readUtm = () => {
    if (typeof window === 'undefined') return {}
    const p = new URLSearchParams(window.location.search)
    return {
      utm_source:   p.get('utm_source')   ?? undefined,
      utm_medium:   p.get('utm_medium')   ?? undefined,
      utm_campaign: p.get('utm_campaign') ?? undefined,
      source_page:  window.location.href,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      ...form,
      lead_source: 'web_ads' as const,
      ...readUtm(),
    }

    // Client-side Zod validation
    let parsed: TripGenieLeadInput
    try {
      parsed = TripGenieLeadSchema.parse(payload)
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: FormErrors = {}
        for (const issue of err.issues) {
          const key = issue.path[0] as keyof TripGenieLeadInput
          if (!fieldErrors[key]) fieldErrors[key] = issue.message
        }
        setErrors(fieldErrors)
      }
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(parsed),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrors({ full_name: data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.' })
        return
      }

      setStep('success')
    } catch {
      setErrors({ full_name: 'Không thể kết nối máy chủ. Vui lòng thử lại sau.' })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const zaloUrl = process.env.NEXT_PUBLIC_ZALO_URL ?? 'https://zalo.me/0932611933'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal panel */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#005BAA]">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-widest">TripGenie</p>
            <h2 className="text-white font-bold text-lg leading-tight">Tạo lịch trình miễn phí</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6">
          {step === 'success' ? (
            /* ── SUCCESS ── */
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={36} className="text-green-500" />
              </div>
              <h3 className="text-[#1A1A2E] font-bold text-xl mb-2">Đã nhận yêu cầu!</h3>
              <p className="text-[#666666] text-sm mb-6 max-w-xs">
                Chuyên viên TripGenie sẽ liên hệ tư vấn lịch trình trong vòng <strong>30 phút</strong> trong giờ hành chính.
              </p>
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#005BAA] text-white font-semibold rounded-full hover:bg-[#0078D7] transition-colors mb-3"
              >
                <MessageCircle size={17} />
                Chat ngay qua Zalo
              </a>
              <button
                onClick={onClose}
                className="text-sm text-[#666666] hover:text-[#1A1A2E] transition-colors"
              >
                Đóng
              </button>
            </div>
          ) : (
            /* ── FORM ── */
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <p className="text-[#666666] text-sm">
                Điền thông tin để nhận tư vấn lịch trình <strong className="text-[#005BAA]">hoàn toàn miễn phí</strong>.
              </p>

              {/* Row 1: Họ tên + Điện thoại */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Họ và tên *" error={errors.full_name}>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    className={inputClass(!!errors.full_name)}
                  />
                </Field>
                <Field label="Số điện thoại *" error={errors.phone}>
                  <input
                    type="tel"
                    placeholder="0932 611 933"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className={inputClass(!!errors.phone)}
                  />
                </Field>
              </div>

              {/* Row 2: Số Zalo + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Số Zalo (nếu khác SĐT)" error={errors.zalo_number}>
                  <input
                    type="tel"
                    placeholder="Để trống nếu giống SĐT"
                    value={form.zalo_number}
                    onChange={e => set('zalo_number', e.target.value)}
                    className={inputClass(!!errors.zalo_number)}
                  />
                </Field>
                <Field label="Email" error={errors.email}>
                  <input
                    type="email"
                    placeholder="email@gmail.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className={inputClass(!!errors.email)}
                  />
                </Field>
              </div>

              {/* Điểm đến */}
              <Field label="Điểm đến quan tâm *" error={errors.destination_interest}>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhật Bản, Đà Nẵng, Phú Quốc..."
                  value={form.destination_interest}
                  onChange={e => set('destination_interest', e.target.value)}
                  className={inputClass(!!errors.destination_interest)}
                />
              </Field>

              {/* Row 3: Budget + Ngày đi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Ngân sách dự kiến *" error={errors.budget}>
                  <select
                    value={form.budget}
                    onChange={e => set('budget', e.target.value as TripGenieLeadInput['budget'])}
                    className={inputClass(!!errors.budget)}
                  >
                    <option value="">-- Chọn ngân sách --</option>
                    {BUDGET_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Ngày dự kiến đi *" error={errors.travel_date}>
                  <input
                    type="date"
                    value={form.travel_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => set('travel_date', e.target.value)}
                    className={inputClass(!!errors.travel_date)}
                  />
                </Field>
              </div>

              {/* Ghi chú */}
              <Field label="Ghi chú thêm" error={errors.message}>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: gia đình 4 người, muốn đi biển, ưu tiên resort..."
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                  className={inputClass(!!errors.message) + ' resize-none'}
                />
              </Field>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="submit"
                  loading={loading}
                  className="flex-1 !bg-[#FF6B00] hover:!bg-orange-600 !text-white gap-2"
                  size="lg"
                >
                  <Send size={16} />
                  Nhận tư vấn miễn phí
                </Button>
                <a
                  href={zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-[#005BAA] text-[#005BAA] font-semibold text-base hover:bg-[#F0F7FF] transition-colors"
                >
                  <MessageCircle size={16} />
                  Chat Zalo ngay
                </a>
              </div>

              <p className="text-center text-[11px] text-[#666666]">
                Thông tin được bảo mật. Chúng tôi <strong>không</strong> spam.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[#1A1A2E]">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full px-3 py-2.5 text-sm rounded-xl border transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-[#005BAA]/30',
    'placeholder:text-gray-400 text-[#1A1A2E] bg-white',
    hasError
      ? 'border-red-400 focus:border-red-400'
      : 'border-gray-200 focus:border-[#005BAA]',
  ].join(' ')
}

// ── Export wrapped in ErrorBoundary ──────────────────────────────────────────

export function TripGenieLeadModal(props: TripGenieLeadModalProps) {
  return (
    <ErrorBoundary moduleName="TripGenieLeadModal">
      <ModalInner {...props} />
    </ErrorBoundary>
  )
}

// ── Hook helper để dùng ở các page ───────────────────────────────────────────

export function useTripGenieModal() {
  const [isOpen, setIsOpen]                   = useState(false)
  const [destination, setDestination]         = useState<string | undefined>(undefined)
  const open  = useCallback((dest?: string) => { setDestination(dest); setIsOpen(true) }, [])
  const close = useCallback(() => setIsOpen(false), [])
  return { isOpen, destination, open, close }
}
