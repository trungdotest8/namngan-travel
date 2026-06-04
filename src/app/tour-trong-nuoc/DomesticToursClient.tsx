'use client'

import { useMemo, useState } from 'react'
import TourListingCard, { type TourListingCardProps } from '@/components/tours/TourListingCard'
import { MapPin } from 'lucide-react'

interface Props {
  tours: TourListingCardProps[]
}

export default function DomesticToursClient({ tours }: Props) {
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null)

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

  return (
    <>
      {/* Hashtag filter chips */}
      {allHashtags.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {activeHashtag && (
              <button
                onClick={() => setActiveHashtag(null)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 bg-white text-[#666666] hover:border-[#005BAA] transition-colors"
              >
                Xoá lọc ×
              </button>
            )}
            {allHashtags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveHashtag(activeHashtag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeHashtag === tag
                    ? 'bg-[#005BAA] text-white border-[#005BAA]'
                    : 'bg-[#F0F7FF] text-[#005BAA] border-[#005BAA]/20 hover:border-[#005BAA]'
                }`}
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result count */}
      <p className="text-sm text-[#666666] mb-6">
        Tìm thấy{' '}
        <span className="font-semibold text-[#1A1A2E]">{filtered.length}</span>{' '}
        tour trong nước
        {activeHashtag ? ` với tag "${activeHashtag}"` : ''}
      </p>

      {/* Tour grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F0F7FF] flex items-center justify-center mb-4">
            <MapPin size={28} className="text-[#005BAA]" />
          </div>
          <p className="font-medium text-[#1A1A2E] mb-1">Không tìm thấy tour phù hợp</p>
          <p className="text-sm text-[#666666] mb-4">Thử chọn tag khác</p>
          <button
            onClick={() => setActiveHashtag(null)}
            className="text-sm font-semibold text-white bg-[#005BAA] px-5 py-2 rounded-full hover:bg-[#0078D7] transition-colors"
          >
            Xem tất cả
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((t, index) => (
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
