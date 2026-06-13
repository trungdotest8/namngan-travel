'use client'

import { useState } from 'react'
import Image from 'next/image'
import { GalleryLightbox } from './GalleryLightbox'

interface Props {
  images:   string[]
  tourName: string
}

// ── Desktop grid layouts ───────────────────────────────────────────────────────

function DesktopGrid({ images, tourName, onOpen }: Props & { onOpen: (i: number) => void }) {
  const total = images.length

  // 1 image: full width 16:9
  if (total === 1) {
    return (
      <div
        className="relative w-full rounded-xl overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '16/9' }}
        onClick={() => onOpen(0)}
      >
        <Image
          src={images[0]}
          alt={tourName}
          fill
          className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          sizes="(max-width:768px) 100vw, 80vw"
          quality={75}
          priority
        />
      </div>
    )
  }

  // 2 images: side by side 4:3 each
  if (total === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {images.map((url, i) => (
          <div
            key={i}
            className="relative rounded-xl overflow-hidden cursor-pointer group"
            style={{ aspectRatio: '4/3' }}
            onClick={() => onOpen(i)}
          >
            <Image
              src={url}
              alt={`${tourName} ${i + 1}`}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
              sizes="(max-width:768px) 100vw, 40vw"
              quality={75}
              priority={i === 0}
            />
          </div>
        ))}
      </div>
    )
  }

  // 3 images: left 50% large + right 2 stacked
  if (total === 3) {
    return (
      <div className="grid grid-cols-2 gap-2 h-72">
        <div
          className="relative rounded-xl overflow-hidden cursor-pointer group h-full"
          onClick={() => onOpen(0)}
        >
          <Image
            src={images[0]}
            alt={tourName}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width:768px) 100vw, 50vw"
            quality={75}
            priority
          />
        </div>
        <div className="grid grid-rows-2 gap-2 h-full">
          {images.slice(1, 3).map((url, i) => (
            <div
              key={i}
              className="relative rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => onOpen(i + 1)}
            >
              <Image
                src={url}
                alt={`${tourName} ${i + 2}`}
                fill
                className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                sizes="(max-width:768px) 100vw, 25vw"
                quality={75}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 4 images: 2×2 grid
  if (total === 4) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {images.map((url, i) => (
          <div
            key={i}
            className="relative rounded-xl overflow-hidden cursor-pointer group"
            style={{ aspectRatio: '4/3' }}
            onClick={() => onOpen(i)}
          >
            <Image
              src={url}
              alt={`${tourName} ${i + 1}`}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
              sizes="(max-width:768px) 100vw, 40vw"
              quality={75}
              priority={i === 0}
            />
          </div>
        ))}
      </div>
    )
  }

  // ≥5 images: large left (50%) + 2×2 grid right (50%)
  const extraCount = total - 5
  return (
    <div className="grid grid-cols-2 gap-2 h-[420px]">
      {/* Large image — left */}
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer group h-full"
        onClick={() => onOpen(0)}
      >
        <Image
          src={images[0]}
          alt={tourName}
          fill
          className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          sizes="(max-width:768px) 100vw, 50vw"
          quality={75}
          priority
        />
        {/* "Xem tất cả" overlay — bottom-right of large image */}
        {extraCount > 0 && (
          <button
            onClick={e => { e.stopPropagation(); onOpen(0) }}
            className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm"
          >
            Xem tất cả ảnh (+{extraCount})
          </button>
        )}
      </div>

      {/* 4 small images — right 2×2 */}
      <div className="grid grid-cols-2 gap-2 h-full">
        {images.slice(1, 5).map((url, i) => (
          <div
            key={i}
            className="relative rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => onOpen(i + 1)}
          >
            <Image
              src={url}
              alt={`${tourName} ${i + 2}`}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
              sizes="(max-width:768px) 100vw, 25vw"
              quality={75}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mobile carousel (CSS scroll-snap, no library) ─────────────────────────────

function MobileCarousel({ images, tourName, onOpen }: Props & { onOpen: (i: number) => void }) {
  const total = images.length
  return (
    <div
      className="flex gap-2 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2"
      style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
    >
      {images.map((url, i) => (
        <div
          key={i}
          className="flex-shrink-0 relative snap-start rounded-xl overflow-hidden cursor-pointer"
          style={{ width: 'calc(85vw)', aspectRatio: '4/3' }}
          onClick={() => onOpen(i)}
        >
          <Image
            src={url}
            alt={`${tourName} ${i + 1}`}
            fill
            className="object-cover"
            sizes="85vw"
            quality={75}
            priority={i === 0}
          />
          {/* Badge [i/n] */}
          <div className="absolute bottom-2 right-2 bg-black/55 text-white text-[11px] px-2 py-0.5 rounded-full font-medium pointer-events-none">
            {i + 1}/{total}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function TourGallery({ images, tourName }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  if (!Array.isArray(images) || images.length === 0) return null

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <DesktopGrid images={images} tourName={tourName} onOpen={setLightboxIdx} />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <MobileCarousel images={images} tourName={tourName} onOpen={setLightboxIdx} />
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <GalleryLightbox
          images={images}
          initialIndex={lightboxIdx}
          tourName={tourName}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  )
}
