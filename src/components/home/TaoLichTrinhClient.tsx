'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Route, MessageSquare, CheckCircle,
  Clock, Shield, ChevronRight, ArrowRight,
} from 'lucide-react'
import { TripGenieLeadModal } from '@/components/booking/TripGenieLeadModal'

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: MessageSquare,
    title: 'Chia sẻ kế hoạch',
    desc:  'Cho chúng tôi biết điểm đến, ngân sách và thời gian. Chỉ mất 2 phút.',
  },
  {
    step: '02',
    icon: Sparkles,
    title: 'TripGenie phân tích',
    desc:  'AI của chúng tôi phân tích 49+ tour sẵn có và tạo lịch trình phù hợp nhất.',
  },
  {
    step: '03',
    icon: Route,
    title: 'Nhận lịch trình chi tiết',
    desc:  'Chuyên viên gửi lịch trình cá nhân hóa kèm báo giá qua Zalo trong 30 phút.',
  },
]

const BENEFITS = [
  { icon: CheckCircle, text: 'Hoàn toàn miễn phí — không phí tư vấn' },
  { icon: Clock,       text: 'Phản hồi trong 30 phút giờ hành chính' },
  { icon: Shield,      text: 'Thông tin bảo mật — không spam' },
  { icon: Sparkles,    text: 'Lịch trình cá nhân hóa theo sở thích' },
]

const SAMPLE_DESTINATIONS = [
  'Nhật Bản', 'Hàn Quốc', 'Trung Quốc', 'Thái Lan',
  'Phú Quốc', 'Đà Nẵng', 'Hà Giang', 'Đà Lạt', 'Sapa',
]

export function TaoLichTrinhClient() {
  const [modalOpen, setModalOpen] = useState(false)
  const [destination, setDest]    = useState<string | undefined>(undefined)
  const zaloUrl = process.env.NEXT_PUBLIC_ZALO_URL ?? 'https://zalo.me/0932611933'

  const openWithDest = (dest: string) => { setDest(dest); setModalOpen(true) }
  const openModal    = ()             => { setDest(undefined); setModalOpen(true) }

  return (
    <>
      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="bg-gradient-to-br from-[#002d5c] via-[#005BAA] to-[#0078D7] text-white py-14 sm:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 border border-white/25 rounded-full text-sm font-semibold mb-5">
              <Sparkles size={14} />
              TripGenie — AI Du Lịch
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
              Tạo lịch trình du lịch<br className="hidden sm:block" />
              <span className="text-[#FF6B00]"> miễn phí</span> chỉ trong vài phút
            </h1>
            <p className="text-white/80 text-base sm:text-lg max-w-xl mx-auto mb-8">
              Cho biết điểm đến và ngân sách — TripGenie sẽ gợi ý lịch trình chi tiết, cá nhân hóa cho bạn.
            </p>

            {/* Destination shortcuts */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {SAMPLE_DESTINATIONS.map(dest => (
                <button
                  key={dest}
                  onClick={() => openWithDest(dest)}
                  className="px-4 py-1.5 bg-white/15 hover:bg-white/25 border border-white/25 text-white text-sm font-medium rounded-full transition-colors"
                >
                  {dest}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* CTA 1: Tạo lịch trình — Accent Orange */}
              <button
                onClick={openModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#FF6B00] hover:bg-orange-600 text-white font-bold text-base rounded-full transition-colors shadow-xl"
              >
                <Sparkles size={18} />
                Tạo lịch trình ngay
                <ArrowRight size={16} />
              </button>
              {/* CTA 2: Nhận tư vấn qua Zalo */}
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold text-base rounded-full transition-colors"
              >
                <MessageSquare size={17} />
                Nhận tư vấn qua Zalo
              </a>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-[#FF6B00] text-xs font-bold uppercase tracking-widest mb-2">Quy trình</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E]">Chỉ 3 bước đơn giản</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {HOW_IT_WORKS.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.step} className="relative flex flex-col items-center text-center p-6">
                    <div className="text-[#005BAA]/10 font-black text-6xl absolute top-2 left-4 select-none">{item.step}</div>
                    <div className="w-14 h-14 bg-[#005BAA] rounded-2xl flex items-center justify-center mb-4 relative z-10">
                      <Icon size={24} className="text-white" />
                    </div>
                    <h3 className="font-bold text-[#1A1A2E] text-base mb-2 relative z-10">{item.title}</h3>
                    <p className="text-[#666666] text-sm leading-relaxed relative z-10">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Benefits ── */}
        <section className="py-10 sm:py-14 bg-[#F0F7FF]">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E]">Tại sao chọn TripGenie?</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BENEFITS.map((b) => {
                const Icon = b.icon
                return (
                  <div key={b.text} className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm">
                    <div className="w-10 h-10 bg-[#005BAA]/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-[#005BAA]" />
                    </div>
                    <p className="font-medium text-[#1A1A2E] text-sm">{b.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Coming soon placeholder ── */}
        <section className="py-10 sm:py-14 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-xs font-semibold mb-4">
              <Clock size={13} />
              Đang phát triển
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A2E] mb-3">
              AI Itinerary Builder — Sắp ra mắt
            </h2>
            <p className="text-[#666666] text-sm sm:text-base mb-6 max-w-lg mx-auto">
              Tính năng tạo lịch trình tự động bằng AI đang được phát triển. Hiện tại chuyên viên của chúng tôi
              sẽ tư vấn và gửi lịch trình qua Zalo trong 30 phút.
            </p>
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#005BAA] hover:bg-[#0078D7] text-white font-semibold rounded-full transition-colors"
            >
              Nhận tư vấn ngay hôm nay
              <ChevronRight size={16} />
            </button>
          </div>
        </section>

        {/* ── Popular tours CTA ── */}
        <section className="py-10 sm:py-14 bg-[#F8FAFC]">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A2E] mb-2">
              Hoặc duyệt tour có sẵn của chúng tôi
            </h2>
            <p className="text-[#666666] text-sm mb-6">49 tour đã được kiểm duyệt, sẵn sàng khởi hành.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/tour-nuoc-ngoai"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#005BAA] text-white font-semibold rounded-full hover:bg-[#0078D7] transition-colors"
              >
                Tour quốc tế
                <ChevronRight size={15} />
              </Link>
              <Link
                href="/tour-trong-nuoc"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-[#005BAA] text-[#005BAA] font-semibold rounded-full hover:bg-[#F0F7FF] transition-colors"
              >
                Tour trong nước
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <TripGenieLeadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDestination={destination}
      />
    </>
  )
}
