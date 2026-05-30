'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LeadFormSchema } from '@/lib/validations/lead.schema'

const SESSION_KEY     = 'nnt_popup_shown'
const POPUP_DELAY_MS  = 5000   // 5 giây
const SCROLL_PCT      = 30     // % trang đã cuộn

function readUtm() {
  const p = new URLSearchParams(window.location.search)
  return {
    utm_source:   p.get('utm_source')   ?? undefined,
    utm_medium:   p.get('utm_medium')   ?? undefined,
    utm_campaign: p.get('utm_campaign') ?? undefined,
  }
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

type FieldErrors = { name?: string; phone?: string; dest?: string }

function AutoPopupInner() {
  const [visible, setVisible] = useState(false)
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [dest,    setDest]    = useState('')
  const [errors,  setErrors]  = useState<FieldErrors>({})
  const [status,  setStatus]  = useState<SubmitStatus>('idle')

  const show = useCallback(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(true)
  }, [])

  const close = () => setVisible(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return

    const timer = setTimeout(show, POPUP_DELAY_MS)

    const onScroll = () => {
      const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      if (scrolled >= SCROLL_PCT) show()
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [show])

  // Đóng popup khi nhấn Escape
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible])

  const validate = () => {
    const parsed = LeadFormSchema.safeParse({
      full_name:   name.trim(),
      phone:       phone.trim().replace(/\s/g, ''),
      message:     dest.trim(),
      lead_source: 'popup',
    })
    const newErrors: FieldErrors = {}
    if (name.trim().length < 2)  newErrors.name  = 'Vui lòng nhập họ và tên'
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      if (fe.phone?.[0]) newErrors.phone = fe.phone[0]
    }
    if (dest.trim().length < 2)  newErrors.dest  = 'Vui lòng nhập điểm đến'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const submit = async () => {
    if (!validate() || status === 'loading') return
    setStatus('loading')
    try {
      const res = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:   name.trim(),
          phone:       phone.trim().replace(/\s/g, ''),
          message:     dest.trim(),
          lead_source: 'popup',
          source_page: window.location.href,
          ...readUtm(),
        }),
      })
      if (!res.ok) throw new Error('API error')
      setStatus('success')
      setTimeout(close, 3000)
    } catch {
      setStatus('error')
    }
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Form nhận tư vấn du lịch"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4
                 bg-black/45 font-sans"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl">
        {/* Banner */}
        <div className="relative bg-gradient-to-br from-brand-blue to-[#0040c8] px-6 py-7 text-center">
          <button
            onClick={close}
            aria-label="Đóng popup"
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/35
                       flex items-center justify-center text-white transition-colors"
          >
            <X size={14} />
          </button>
          {/* Decor dots */}
          <span className="absolute w-24 h-24 rounded-full bg-white/[0.08] -top-6 -left-5 pointer-events-none" />
          <span className="absolute w-16 h-16 rounded-full bg-white/[0.08] -bottom-4 right-2 pointer-events-none" />

          <h2 className="text-white text-xl font-bold leading-snug relative">
            Nam Ngân Travel
          </h2>
          <p className="text-white/85 text-sm mt-1.5 leading-snug relative">
            Để lại thông tin — nhận tư vấn hành trình<br />miễn phí trong hôm nay!
          </p>
        </div>

        {/* Body */}
        {status === 'success' ? (
          <div className="px-6 py-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cảm ơn bạn!</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Chúng tôi sẽ liên hệ tư vấn trong thời gian sớm nhất.<br />
              <span className="text-xs text-gray-400">Popup tự đóng sau 3 giây.</span>
            </p>
          </div>
        ) : (
          <div className="px-6 py-5">
            {status === 'error' && (
              <p className="text-xs text-red-500 mb-4 bg-red-50 px-3 py-2 rounded-lg">
                Có lỗi xảy ra. Vui lòng thử lại.
              </p>
            )}

            {/* Họ tên */}
            <div className="mb-3.5">
              <label htmlFor="pp-name" className="block text-xs font-medium text-gray-500 mb-1">Họ và tên</label>
              <input
                id="pp-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                className={`w-full text-sm px-3 py-2.5 border rounded-lg outline-none bg-gray-50 text-gray-900 transition-colors
                  focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10
                  ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Số điện thoại */}
            <div className="mb-3.5">
              <label htmlFor="pp-phone" className="block text-xs font-medium text-gray-500 mb-1">Số điện thoại</label>
              <input
                id="pp-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901 234 567"
                autoComplete="tel"
                className={`w-full text-sm px-3 py-2.5 border rounded-lg outline-none bg-gray-50 text-gray-900 transition-colors
                  focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10
                  ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>}
            </div>

            {/* Điểm đến */}
            <div className="mb-4">
              <label htmlFor="pp-dest" className="block text-xs font-medium text-gray-500 mb-1">Điểm đến muốn tư vấn</label>
              <input
                id="pp-dest"
                type="text"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                placeholder="Đà Lạt, Phú Quốc, Nhật Bản…"
                className={`w-full text-sm px-3 py-2.5 border rounded-lg outline-none bg-gray-50 text-gray-900 transition-colors
                  focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10
                  ${errors.dest ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.dest && <p className="text-[11px] text-red-500 mt-1">{errors.dest}</p>}
            </div>

            <button
              onClick={submit}
              disabled={status === 'loading'}
              className="w-full py-3 bg-brand-blue hover:bg-brand-light text-white text-[15px] font-semibold rounded-lg
                         transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Đang gửi…' : 'Nhận tư vấn ngay ✈️'}
            </button>

            <p className="text-[11px] text-gray-400 text-center mt-2.5">
              Chúng tôi cam kết không spam. Thông tin chỉ dùng để tư vấn.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AutoPopup() {
  return (
    <ErrorBoundary moduleName="AutoPopup">
      <AutoPopupInner />
    </ErrorBoundary>
  )
}
