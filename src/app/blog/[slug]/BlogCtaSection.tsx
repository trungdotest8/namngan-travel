'use client'

import { useState } from 'react'
import { Sparkles, MessageCircle } from 'lucide-react'
import { TripGenieLeadModal } from '@/components/booking/TripGenieLeadModal'

export default function BlogCtaSection() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="bg-gradient-to-r from-[#005BAA] to-[#0078D7] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
        <div>
          <h3 className="font-bold text-base sm:text-lg mb-1">Muốn đặt tour ngay?</h3>
          <p className="text-white/80 text-sm">Nhận tư vấn lịch trình cá nhân hóa hoàn toàn miễn phí.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-orange-600 text-white text-sm font-semibold rounded-full transition-colors"
          >
            <Sparkles size={14} />
            Tạo lịch trình miễn phí
          </button>
          <a
            href={process.env.NEXT_PUBLIC_ZALO_URL ?? 'https://zalo.me/0932611933'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 border border-white/25 text-white text-sm font-semibold rounded-full transition-colors"
          >
            <MessageCircle size={14} />
            Chat Zalo
          </a>
        </div>
      </div>

      <TripGenieLeadModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
