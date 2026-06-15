'use client'

import { useState } from 'react'
import Image from 'next/image'
import { GalleryLightbox } from './GalleryLightbox'

// Tương thích ngược: images có thể là string[] (cũ) hoặc TourImage[] (migration #27)
export type TourImageItem = { url: string; alt?: string; order?: number; caption?: string }

function getImgUrl(img: string | TourImageItem): string {
  return typeof img === 'string' ? img : img.url
}
function getImgAlt(img: string | TourImageItem, fallback: string): string {
  return typeof img === 'string' ? fallback : (img.alt || fallback)
}

interface Props {
  images:   (string | TourImageItem)[]
  tourName: string
}

// ── Desktop grid layouts ───────────────────────────────────────────────────────

function DesktopGrid({ images, tourName, onOpen }: Props & { onOpen: (i: number) => void }) {
  const total = images.length

  // 1 ảnh: full width 16:9
  if (total === 1) {
    return (
      <div
        className="relative w-full rounded-xl overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '16/9' }}
        onClick={() => onOpen(0)}
      >
        <Image
          src={getImgUrl(images[0])}
          alt={getImgAlt(images[0], tourName)}
          fill
          className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          sizes="(max-width:768px) 100vw, 80vw"
          quality={75}
          priority
        />
      </div>
    )
  }

  // 2 ảnh: trái 60% + phải 40%
  if (total === 2) {
    return (
      <div className="grid gap-2 h-64" style={{ gridTemplateColumns: '3fr 2fr' }}>
        {images.map((img, i) => (
          <div
            key={i}
            className="relative rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => onOpen(i)}
          >
            <Image
              src={getImgUrl(img)}
              alt={getImgAlt(img, `${tourName} ${i + 1}`)}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
              sizes="(max-width:768px) 100vw, 50vw"
              quality={75}
              priority={i === 0}
            />
          </div>
        ))}
      </div>
    )
  }

  // 3 ảnh: trái 60% large + phải 40% xếp 2 ảnh đều nhau
  if (total === 3) {
    return (
      <div className="grid gap-2 h-72" style={{ gridTemplateColumns: '3fr 2fr' }}>
        <div
          className="relative rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => onOpen(0)}
        >
          <Image
            src={getImgUrl(images[0])}
            alt={getImgAlt(images[0], tourName)}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width:768px) 100vw, 60vw"
            quality={75}
            priority
          />
        </div>
        <div className="grid grid-rows-2 gap-2">
          {images.slice(1, 3).map((img, i) => (
            <div
              key={i}
              className="relative rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => onOpen(i + 1)}
            >
              <Image
                src={getImgUrl(img)}
                alt={getImgAlt(img, `${tourName} ${i + 2}`)}
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

  // 4 ảnh: 1 lớn trái (50%) + phải: 2 ảnh trên (50/50) + 1 ảnh dưới full width
  if (total === 4) {
    return (
      <div className="grid grid-cols-2 gap-2 h-72">
        {/* Ảnh lớn trái — full height */}
        <div
          className="relative rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => onOpen(0)}
        >
          <Image
            src={getImgUrl(images[0])}
            alt={getImgAlt(images[0], tourName)}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width:768px) 100vw, 50vw"
            quality={75}
            priority
          />
        </div>
        {/* Cột phải: 2 ảnh nhỏ trên + 1 ảnh full width dưới */}
        <div className="grid grid-rows-2 gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div
              className="relative rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => onOpen(1)}
            >
              <Image
                src={getImgUrl(images[1])}
                alt={getImgAlt(images[1], `${tourName} 2`)}
                fill
                className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                sizes="(max-width:768px) 100vw, 25vw"
                quality={75}
              />
            </div>
            <div
              className="relative rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => onOpen(2)}
            >
              <Image
                src={getImgUrl(images[2])}
                alt={getImgAlt(images[2], `${tourName} 3`)}
                fill
                className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                sizes="(max-width:768px) 100vw, 25vw"
                quality={75}
              />
            </div>
          </div>
          <div
            className="relative rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => onOpen(3)}
          >
            <Image
              src={getImgUrl(images[3])}
              alt={getImgAlt(images[3], `${tourName} 4`)}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
              sizes="(max-width:768px) 100vw, 50vw"
              quality={75}
            />
          </div>
        </div>
      </div>
    )
  }

  // ≥5 ảnh: 1 lớn trái (50%) + grid 2×2 phải; nút "Xem tất cả" góc dưới-phải ảnh thứ 5
  const extraCount = total - 5
  return (
    <div className="grid grid-cols-2 gap-2 h-[420px]">
      {/* Ảnh lớn — trái */}
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer group h-full"
        onClick={() => onOpen(0)}
      >
        <Image
          src={getImgUrl(images[0])}
          alt={getImgAlt(images[0], tourName)}
          fill
          className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          sizes="(max-width:768px) 100vw, 50vw"
          quality={75}
          priority
        />
      </div>

      {/* 4 ảnh nhỏ — phải 2×2 */}
      <div className="grid grid-cols-2 gap-2 h-full">
        {images.slice(1, 5).map((img, i) => (
          <div
            key={i}
            className="relative rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => onOpen(i + 1)}
          >
            <Image
              src={getImgUrl(img)}
              alt={getImgAlt(img, `${tourName} ${i + 2}`)}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
              sizes="(max-width:768px) 100vw, 25vw"
              quality={75}
            />
            {/* "Xem tất cả" overlay — góc dưới-phải ảnh thứ 5 (i=3) */}
            {i === 3 && extraCount > 0 && (
              <button
                onClick={e => { e.stopPropagation(); onOpen(5) }}
                className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm"
              >
                Xem tất cả ảnh (+{extraCount})
              </button>
            )}
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
      {images.map((img, i) => (
        <div
          key={i}
          className="flex-shrink-0 relative snap-start rounded-xl overflow-hidden cursor-pointer"
          style={{ width: 'calc(85vw)', aspectRatio: '16/9' }}
          onClick={() => onOpen(i)}
        >
          <Image
            src={getImgUrl(img)}
            alt={getImgAlt(img, `${tourName} ${i + 1}`)}
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

  // Normalize sang string[] để GalleryLightbox dùng (lightbox chỉ cần URL)
  const urls = images.map(getImgUrl)

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
          images={urls}
          initialIndex={lightboxIdx}
          tourName={tourName}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  )
}
