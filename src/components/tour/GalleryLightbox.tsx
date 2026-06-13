'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

interface Props {
  images:       string[]
  initialIndex: number
  tourName:     string
  onClose:      () => void
}

function LightboxInner({ images, initialIndex, tourName, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex)
  const total = images.length

  function prev() { setCurrent(i => (i - 1 + total) % total) }
  function next() { setCurrent(i => (i + 1) % total) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Thư viện ảnh — ${tourName}`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Image container — stop propagation so clicking image doesn't close */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative w-full h-full max-w-5xl mx-auto">
          <Image
            src={images[current]}
            alt={`${tourName} — ảnh ${current + 1}/${total}`}
            fill
            className="object-contain"
            sizes="100vw"
            quality={85}
            priority
          />
        </div>

        {/* Counter */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-1.5 rounded-full font-medium pointer-events-none">
          {current + 1} / {total}
        </div>

        {/* Prev */}
        {total > 1 && (
          <button
            onClick={e => { e.stopPropagation(); prev() }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            aria-label="Ảnh trước"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Next */}
        {total > 1 && (
          <button
            onClick={e => { e.stopPropagation(); next() }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            aria-label="Ảnh tiếp"
          >
            <ChevronRight size={22} />
          </button>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

export function GalleryLightbox(props: Props) {
  return (
    <ErrorBoundary moduleName="GalleryLightbox">
      <LightboxInner {...props} />
    </ErrorBoundary>
  )
}
