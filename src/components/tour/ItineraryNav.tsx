'use client'

import { useEffect, useRef, useState } from 'react'
import type { TourItineraryDay } from '@/types/tour.types'

interface Props {
  days: TourItineraryDay[]
}

export default function ItineraryNav({ days }: Props) {
  const [activeDay, setActiveDay] = useState(days[0]?.day ?? 1)
  const obsRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    obsRef.current?.disconnect()

    obsRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const n = parseInt(visible[0].target.id.replace('day-', ''), 10)
          if (!isNaN(n)) setActiveDay(n)
        }
      },
      { rootMargin: '-15% 0px -60% 0px', threshold: 0 },
    )

    days.forEach(d => {
      const el = document.getElementById(`day-${d.day}`)
      if (el) obsRef.current!.observe(el)
    })

    return () => obsRef.current?.disconnect()
  }, [days])

  function scrollTo(day: number) {
    document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-[11px] font-semibold text-[#005BAA] uppercase tracking-wide mb-3">
        Lịch trình
      </p>
      <ul className="space-y-0.5">
        {days.map(d => {
          const active = activeDay === d.day
          return (
            <li key={d.day}>
              <button
                onClick={() => scrollTo(d.day)}
                className={[
                  'w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-all',
                  'border-l-[3px]',
                  active
                    ? 'border-[#005BAA] text-[#005BAA] font-semibold bg-[#F0F7FF]'
                    : 'border-transparent text-[#666666] hover:text-[#005BAA] hover:bg-gray-50',
                ].join(' ')}
              >
                <span className="font-medium">Ngày {d.day}:</span>{' '}
                <span className="line-clamp-1">{d.title}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
