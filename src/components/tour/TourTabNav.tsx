'use client'

import { useEffect, useState } from 'react'

type TabId = 'itinerary' | 'schedule'

export default function TourTabNav() {
  const [active, setActive] = useState<TabId>('itinerary')

  useEffect(() => {
    const ids: TabId[] = ['itinerary', 'schedule']
    const elements = ids
      .map(id => document.getElementById(`section-${id}`))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const obs = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('section-', '') as TabId
            setActive(id)
          }
        }
      },
      { threshold: 0.2, rootMargin: '-72px 0px -30% 0px' }
    )

    elements.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const tabs: { id: TabId; label: string }[] = [
    { id: 'itinerary', label: 'LỊCH TRÌNH TOUR' },
    { id: 'schedule',  label: 'BẢNG GIÁ & NGÀY KHỞI HÀNH' },
  ]

  return (
    <nav className="sticky top-16 z-20 bg-white border-b border-gray-200 shadow-sm -mx-4 sm:-mx-0">
      <div className="flex">
        {tabs.map(tab => (
          <a
            key={tab.id}
            href={`#section-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`flex-1 text-center py-3 px-2 text-xs font-bold tracking-wide transition-colors border-b-2 ${
              active === tab.id
                ? 'border-[#005BAA] text-[#005BAA]'
                : 'border-transparent text-[#666666] hover:text-[#1A1A2E]'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
