'use client'

import { useMemo, useState } from 'react'
import TourListingCard, { type TourListingCardProps } from '@/components/tours/TourListingCard'
import HScrollRow from '@/components/tours/HScrollRow'
import { MapPin, X } from 'lucide-react'

interface Props {
  tours: TourListingCardProps[]
}

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'departure'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default',    label: 'Mặc định'       },
  { key: 'price_asc',  label: 'Giá thấp → cao' },
  { key: 'price_desc', label: 'Giá cao → thấp' },
  { key: 'departure',  label: 'Ngày khởi hành' },
]

export default function DomesticToursClient({ tours }: Props) {
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null)
  const [sort,          setSort]          = useState<SortKey>('default')

  const allHashtags = useMemo(() => {
    const seen = new Set<string>()
    tours.forEach(t => (t.hashtags ?? []).forEach(h => seen.add(h)))
    return [...seen].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [tours])

  const filtered = useMemo(
    () => activeHashtag
      ? tours.filter(t => (t.hashtags ?? []).includes(activeHashtag))
      : tours,
    [tours, activeHashtag]
  )

  const sorted = useMemo(() => {
    const arr = [...filtered]
    if (sort === 'price_asc')  return arr.sort((a, b) => (a.min_price ?? 0) - (b.min_price ?? 0))
    if (sort === 'price_desc') return arr.sort((a, b) => (b.min_price ?? 0) - (a.min_price ?? 0))
    if (sort === 'departure')  return arr.sort((a, b) => {
      if (!a.next_departure) return  1
      if (!b.next_departure) return -1
      return a.next_departure.localeCompare(b.next_departure)
    })
    return arr
  }, [filtered, sort])

  return (
    <>
      {/* ── Hashtag chips ─────────────────────────────────────────────────── */}
      {allHashtags.length > 0 && (
        <HScrollRow className="mb-5 px-0.5">
          {allHashtags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveHashtag(activeHashtag === tag ? null : tag)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeHashtag === tag
                  ? 'bg-[#005BAA] text-white border-[#005BAA]'
                  : 'bg-[#F0F7FF] text-[#005BAA] border-[#005BAA]/20 hover:border-[#005BAA]'
              }`}
            >
              {tag.startsWith('#') ? tag : `#${tag}`}
            </button>
          ))}
        </HScrollRow>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-[#666666]">
            <span className="font-semibold text-[#1A1A2E]">{sorted.length}</span> tour trong nước
            {activeHashtag ? ` · ${activeHashtag}` : ''}
          </p>
          {activeHashtag && (
            <button
              onClick={() => setActiveHashtag(null)}
              className="inline-flex items-center gap-1 text-xs text-[#005BAA] bg-[#F0F7FF]
                         hover:bg-[#005BAA] hover:text-white px-2.5 py-1 rounded-full transition-colors"
            >
              <X size={11} />Xóa lọc
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#666666] hidden sm:block">Sắp xếp:</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-[#1A1A2E] bg-white
                       focus:outline-none focus:border-[#005BAA] cursor-pointer"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Tour grid ─────────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F0F7FF] flex items-center justify-center mb-4">
            <MapPin size={28} className="text-[#005BAA]" />
          </div>
          <p className="font-medium text-[#1A1A2E] mb-1">Không tìm thấy tour phù hợp</p>
          <p className="text-sm text-[#666666] mb-4">Thử chọn tag khác</p>
          <button
            onClick={() => setActiveHashtag(null)}
            className="text-sm font-semibold text-white bg-[#005BAA] px-5 py-2 rounded-full
                       hover:bg-[#0078D7] transition-colors"
          >
            Xem tất cả
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sorted.map((t, index) => (
            <div
              key={t.id}
              className="animate-stagger"
              style={{ '--i': Math.min(index, 11) } as React.CSSProperties}
            >
              <TourListingCard {...t} />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
