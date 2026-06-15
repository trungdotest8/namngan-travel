'use client'

import { useRef, useCallback, useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  children: ReactNode
  className?: string
}

export default function HScrollRow({ children, className = '' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeft,  setShowLeft]  = useState(false)
  const [showRight, setShowRight] = useState(false)

  const update = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowLeft(el.scrollLeft > 4)
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    const mo = new MutationObserver(update)
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
      mo.disconnect()
    }
  }, [update])

  return (
    <div className={`relative ${className}`}>
      {showLeft && (
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2.5 z-10
                     w-7 h-7 bg-white border border-gray-200 rounded-full shadow-md
                     flex items-center justify-center hover:shadow-lg transition-shadow"
          aria-label="Cuộn trái"
        >
          <ChevronLeft size={14} className="text-[#005BAA]" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>

      {showRight && (
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2.5 z-10
                     w-7 h-7 bg-white border border-gray-200 rounded-full shadow-md
                     flex items-center justify-center hover:shadow-lg transition-shadow"
          aria-label="Cuộn phải"
        >
          <ChevronRight size={14} className="text-[#005BAA]" />
        </button>
      )}
    </div>
  )
}
