'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Phone, MessageCircle, User } from 'lucide-react'

const PhoneSchema = z
  .string()
  .regex(/^(0|\+84)[0-9]{8,10}$/, 'Số điện thoại không hợp lệ (đầu 0 hoặc +84, 9–11 chữ số)')

interface Props {
  tourCode: string
  tourName: string
}

export default function TourLeadBox({ tourCode, tourName }: Props) {
  const [phone,   setPhone]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const salesName  = process.env.NEXT_PUBLIC_SALES_NAME  ?? 'Tư vấn viên Nam Ngân'
  const salesPhone = process.env.NEXT_PUBLIC_SALES_PHONE ?? '0932611933'
  const zaloPhone  = salesPhone.replace(/^0/, '84')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean  = phone.replace(/[\s.-]/g, '')
    const parsed = PhoneSchema.safeParse(clean)
    if (!parsed.success) {
      setError(parsed.error.errors[0].message)
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:            'Khách hàng',
          phone:                parsed.data,
          lead_source:          'tour_detail',
          source_channel:       'web_form',
          destination_interest: tourName,
          message:              `Yêu cầu tư vấn: ${tourCode} — ${tourName}`,
        }),
      })
      if (res.ok) {
        setSuccess(true)
      } else {
        setError('Có lỗi xảy ra, vui lòng thử lại')
      }
    } catch {
      setError('Không kết nối được, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#F0F7FF] border border-[#005BAA]/30 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-[#005BAA] uppercase tracking-wide text-center leading-snug">
        Để lại SĐT — Tư vấn miễn phí lịch trình này
      </h3>

      {success ? (
        <div className="text-center py-3 text-sm font-semibold text-[#005BAA]">
          ✓ Đã nhận! Tư vấn viên liên hệ trong 15 phút.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError('') }}
              placeholder="Nhập số điện thoại của bạn..."
              className="w-full px-4 py-3 rounded-xl border border-[#005BAA]/30 bg-white text-[#1A1A2E] text-sm placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#005BAA]/40"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#FF6B00] text-white font-bold text-sm rounded-xl hover:bg-orange-600 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            {loading ? 'Đang gửi…' : 'Nhận tư vấn'}
          </button>
        </form>
      )}

      {/* Advisor card */}
      <div className="flex items-center gap-3 pt-2 border-t border-[#005BAA]/20">
        <div className="w-10 h-10 rounded-full bg-[#005BAA] flex items-center justify-center shrink-0">
          <User size={18} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1A1A2E] truncate">{salesName}</p>
          <p className="text-xs text-[#666666]">{salesPhone}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={`tel:${salesPhone}`}
            className="w-9 h-9 rounded-full bg-[#005BAA] flex items-center justify-center hover:bg-[#0078D7] transition-colors"
            aria-label="Gọi điện tư vấn"
          >
            <Phone size={15} className="text-white" />
          </a>
          <a
            href={`https://zalo.me/${zaloPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full bg-[#0068FF] flex items-center justify-center hover:bg-blue-600 transition-colors"
            aria-label="Nhắn Zalo tư vấn"
          >
            <MessageCircle size={15} className="text-white" />
          </a>
        </div>
      </div>
    </div>
  )
}
