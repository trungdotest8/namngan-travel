'use client'

import { useState } from 'react'
import { Sparkles, Route, MessageSquare, ChevronRight } from 'lucide-react'
import { TripGenieLeadModal } from '@/components/booking/TripGenieLeadModal'

const FEATURES = [
  {
    icon:  Sparkles,
    title: 'AI tư vấn lịch trình',
    desc:  'TripGenie phân tích sở thích, ngân sách và thời gian của bạn để đề xuất hành trình tối ưu.',
  },
  {
    icon:  Route,
    title: 'Lịch trình cá nhân hóa',
    desc:  'Không copy-paste — mỗi lịch trình được tạo riêng cho bạn với điểm tham quan, ẩm thực và nghỉ ngơi phù hợp.',
  },
  {
    icon:  MessageSquare,
    title: 'Tư vấn 1-1 qua Zalo',
    desc:  'Chuyên viên đồng hành từ khâu lên kế hoạch đến khi bạn về đến nhà an toàn.',
  },
]

export function TripGenieSection() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <section className="py-10 sm:py-16 bg-gradient-to-br from-[#003d80] via-[#005BAA] to-[#0078D7] overflow-hidden relative">
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        <div className="container-main relative z-10">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 rounded-full text-white text-xs font-semibold mb-3 border border-white/20">
              <Sparkles size={13} />
              Công nghệ AI mới
            </div>
            <h2 className="text-white font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight mb-3">
              TripGenie — AI Tư Vấn Du Lịch
            </h2>
            <p className="text-white/80 text-sm sm:text-base max-w-xl mx-auto">
              Chỉ cần cho biết điểm đến và ngân sách — TripGenie sẽ tạo lịch trình chi tiết cho bạn trong vài phút.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
            {FEATURES.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 sm:p-6 text-white hover:bg-white/15 transition-colors"
                >
                  <div className="w-11 h-11 bg-[#FF6B00] rounded-xl flex items-center justify-center mb-4">
                    <Icon size={20} className="text-white" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{feat.title}</h3>
                  <p className="text-white/75 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              )
            })}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#FF6B00] hover:bg-orange-600 text-white font-semibold text-base rounded-full transition-colors shadow-lg"
            >
              <Sparkles size={17} />
              Tạo lịch trình miễn phí
            </button>
            <a
              href={process.env.NEXT_PUBLIC_ZALO_URL ?? 'https://zalo.me/0932611933'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold text-base rounded-full transition-colors"
            >
              <MessageSquare size={17} />
              Nhận tư vấn qua Zalo
              <ChevronRight size={15} />
            </a>
          </div>
        </div>
      </section>

      <TripGenieLeadModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
