'use client'

import { useState } from 'react'
import type { TourItineraryDay } from '@/types/tour.types'

interface Props {
  days: TourItineraryDay[]
}

export default function TourTimeline({ days }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          className="text-xs text-[#005BAA] hover:underline"
        >
          {collapsed ? 'Mở tất cả' : 'Thu gọn tất cả'}
        </button>
      </div>

      <div className="space-y-0">
        {days.map((day, idx) => (
          <div key={idx} className="relative flex gap-4">
            {/* Cột trái: vòng tròn + vạch dọc */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[#005BAA] text-white text-xs font-bold flex items-center justify-center shrink-0 z-10 shadow-sm">
                {day.day}
              </div>
              {idx < days.length - 1 && (
                <div className="w-0.5 bg-[#005BAA]/20 flex-1 my-1 min-h-[24px]" />
              )}
            </div>

            {/* Cột phải: nội dung */}
            <div className={`flex-1 min-w-0 ${idx < days.length - 1 ? 'pb-6' : 'pb-2'}`}>
              <p className="font-bold text-[#1A1A2E] text-sm sm:text-base leading-snug pt-1">
                Ngày {day.day}: {day.title}
              </p>

              {day.meals && day.meals.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {day.meals.map(m => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded-full bg-[#F0F7FF] text-[#005BAA] text-xs font-medium border border-[#005BAA]/20"
                    >
                      🍽 {m}
                    </span>
                  ))}
                </div>
              )}

              {!collapsed && day.description && (
                <p className="mt-2 text-sm text-[#444] leading-relaxed whitespace-pre-line">
                  {day.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
