'use client'

import { useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LeadFormSchema } from '@/lib/validations/lead.schema'

// Cấu hình kênh tư vấn — đổi thành NEXT_PUBLIC_ZALO_URL trong .env nếu cần
const ZALO_URL = process.env.NEXT_PUBLIC_ZALO_URL ?? 'https://zalo.me/0774623514'

function readUtm() {
  const p = new URLSearchParams(window.location.search)
  return {
    utm_source:   p.get('utm_source')   ?? undefined,
    utm_medium:   p.get('utm_medium')   ?? undefined,
    utm_campaign: p.get('utm_campaign') ?? undefined,
  }
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

function ChatWidgetInner() {
  const [isOpen,  setIsOpen]  = useState(false)
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [errors,  setErrors]  = useState<{ name?: string; phone?: string }>({})
  const [status,  setStatus]  = useState<SubmitStatus>('idle')

  const toggle = () => setIsOpen((o) => !o)

  const validate = () => {
    const parsed = LeadFormSchema.safeParse({
      full_name:   name.trim(),
      phone:       phone.trim().replace(/\s/g, ''),
      lead_source: 'chat',
    })
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setErrors({ name: fe.full_name?.[0], phone: fe.phone?.[0] })
      return false
    }
    setErrors({})
    return true
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
          lead_source: 'chat',
          source_page: window.location.href,
          ...readUtm(),
        }),
      })
      if (!res.ok) throw new Error('API error')
      setStatus('success')
      setTimeout(() => window.open(ZALO_URL, '_blank'), 1200)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-[9999] font-sans">
      {/* Form popup — hiện khi isOpen */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Form chat tư vấn"
          className="absolute bottom-[72px] right-0 w-[min(300px,calc(100vw-2rem))] bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-brand-blue px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-white text-sm font-semibold">Tư vấn miễn phí</p>
              <p className="text-white/80 text-xs mt-0.5">Phản hồi trong vòng 5 phút</p>
            </div>
            <button
              onClick={toggle}
              aria-label="Đóng"
              className="text-white/75 hover:text-white p-1 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          {status === 'success' ? (
            <div className="px-4 py-7 text-center">
              <p className="text-sm text-gray-500 leading-relaxed">
                Đang chuyển đến Zalo tư vấn…<br />
                <span className="text-xs text-gray-400">Thông tin đã được ghi nhận.</span>
              </p>
            </div>
          ) : (
            <div className="p-4">
              {status === 'error' && (
                <p className="text-xs text-red-500 mb-3 bg-red-50 px-3 py-2 rounded-lg">
                  Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ qua Zalo trực tiếp.
                </p>
              )}

              {/* Họ tên */}
              <div className="mb-3">
                <label htmlFor="cw-name" className="block text-xs text-gray-500 mb-1">Họ và tên</label>
                <input
                  id="cw-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  className={`w-full text-sm px-2.5 py-2 border rounded-lg outline-none bg-gray-50 text-gray-900 transition-colors
                    focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10
                    ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Số điện thoại */}
              <div className="mb-3">
                <label htmlFor="cw-phone" className="block text-xs text-gray-500 mb-1">Số điện thoại</label>
                <input
                  id="cw-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901 234 567"
                  autoComplete="tel"
                  className={`w-full text-sm px-2.5 py-2 border rounded-lg outline-none bg-gray-50 text-gray-900 transition-colors
                    focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10
                    ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <button
                onClick={submit}
                disabled={status === 'loading'}
                className="w-full py-2.5 bg-brand-blue hover:bg-brand-light text-white text-sm font-semibold rounded-lg
                           flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97]
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                {status === 'loading' ? 'Đang gửi…' : 'Bắt đầu tư vấn'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Nút bong bóng */}
      <button
        onClick={toggle}
        aria-label={isOpen ? 'Đóng chat tư vấn' : 'Mở chat tư vấn'}
        className="w-14 h-14 rounded-full bg-brand-blue text-white flex items-center justify-center
                   shadow-lg hover:scale-110 active:scale-95 transition-transform animate-chat-pulse relative"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={26} fill="white" />}
        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" aria-hidden />
        )}
      </button>
    </div>
  )
}

export default function ChatWidget() {
  return (
    <ErrorBoundary moduleName="ChatWidget">
      <ChatWidgetInner />
    </ErrorBoundary>
  )
}
