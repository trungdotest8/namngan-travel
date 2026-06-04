'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import TourListingCard, { type TourListingCardProps } from '@/components/tours/TourListingCard'
import { MapPin, Globe, Flag } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type CategoryParam = 'international' | 'domestic' | null

interface Props {
  tours: TourListingCardProps[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_TABS = [
  { key: null,            label: 'Tất cả',    Icon: Globe },
  { key: 'international', label: 'Quốc tế',   Icon: Globe },
  { key: 'domestic',      label: 'Trong nước', Icon: Flag  },
] as const

function toCategoryParam(value: string | null): CategoryParam {
  if (value === 'international' || value === 'domestic') return value
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ToursClient({ tours }: Props) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [activeCategory, setActiveCategory] = useState<CategoryParam>(
    toCategoryParam(searchParams.get('category'))
  )
  const [activeCountry,  setActiveCountry]  = useState<string | null>(
    searchParams.get('country') ?? null
  )
  const [activeHashtag,  setActiveHashtag]  = useState<string | null>(null)

  // Sync URL ↔ state
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeCategory) {
      params.set('category', activeCategory)
    } else {
      params.delete('category')
    }
    if (activeCountry && activeCategory === 'international') {
      params.set('country', activeCountry)
    } else {
      params.delete('country')
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [activeCategory, activeCountry, router, searchParams])

  // When switching away from international, reset country; always reset hashtag
  function handleCategoryChange(cat: CategoryParam) {
    setActiveCategory(cat)
    if (cat !== 'international') setActiveCountry(null)
    setActiveHashtag(null)
  }

  // Filter by category
  const categoryFiltered = useMemo(() => {
    if (activeCategory === 'international') return tours.filter(t => t.category === 'nước ngoài')
    if (activeCategory === 'domestic')      return tours.filter(t => t.category === 'trong nước')
    return tours
  }, [tours, activeCategory])

  // Derive unique countries (only for international view)
  const countries = useMemo(() => {
    if (activeCategory !== 'international') return []
    const seen = new Set<string>()
    const list: string[] = []
    categoryFiltered.forEach(t => {
      const c = t.country ?? 'Khác'
      if (!seen.has(c)) { seen.add(c); list.push(c) }
    })
    return list.sort((a, b) => a.localeCompare(b, 'vi'))
  }, [categoryFiltered, activeCategory])

  // Derive unique hashtags from category-filtered set (before country/hashtag filter)
  const allHashtags = useMemo(() => {
    const seen = new Set<string>()
    categoryFiltered.forEach(t => (t.hashtags ?? []).forEach(h => seen.add(h)))
    return [...seen].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [categoryFiltered])

  // Filter by country, then hashtag
  const filtered = useMemo(() => {
    let result = categoryFiltered
    if (activeCategory === 'international' && activeCountry) {
      result = result.filter(t => (t.country ?? 'Khác') === activeCountry)
    }
    if (activeHashtag) {
      result = result.filter(t => (t.hashtags ?? []).includes(activeHashtag))
    }
    return result
  }, [categoryFiltered, activeCategory, activeCountry, activeHashtag])

  // Stats
  const intlCount     = useMemo(() => tours.filter(t => t.category === 'nước ngoài').length, [tours])
  const domesticCount = useMemo(() => tours.filter(t => t.category === 'trong nước').length,  [tours])

  return (
    <>
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORY_TABS.map(({ key, label }) => {
          const count = key === 'international' ? intlCount
                      : key === 'domestic'      ? domesticCount
                      : tours.length
          return (
            <button
              key={String(key)}
              onClick={() => handleCategoryChange(key)}
              className={`px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
                activeCategory === key
                  ? 'bg-[#005BAA] text-white border-[#005BAA]'
                  : 'bg-white text-[#1A1A2E] border-gray-200 hover:border-[#005BAA] hover:text-[#005BAA]'
              }`}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Country sub-tabs — international only */}
      {activeCategory === 'international' && countries.length > 0 && (
        <div className="overflow-x-auto pb-1 mb-6 -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveCountry(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors shrink-0 ${
                !activeCountry
                  ? 'bg-[#0078D7] text-white border-[#0078D7]'
                  : 'bg-white text-[#1A1A2E] border-gray-200 hover:border-[#0078D7] hover:text-[#0078D7]'
              }`}
            >
              Tất cả quốc gia ({categoryFiltered.length})
            </button>
            {countries.map(c => {
              const count = categoryFiltered.filter(t => (t.country ?? 'Khác') === c).length
              return (
                <button
                  key={c}
                  onClick={() => setActiveCountry(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors shrink-0 ${
                    activeCountry === c
                      ? 'bg-[#0078D7] text-white border-[#0078D7]'
                      : 'bg-white text-[#1A1A2E] border-gray-200 hover:border-[#0078D7] hover:text-[#0078D7]'
                  }`}
                >
                  {c} ({count})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Hashtag filter chips */}
      {allHashtags.length > 0 && (
        <div className="overflow-x-auto pb-1 mb-5 -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            {activeHashtag && (
              <button
                onClick={() => setActiveHashtag(null)}
                className="px-3 py-1 rounded-full text-xs font-medium border border-gray-300 bg-white text-[#666666] hover:border-[#005BAA] transition-colors shrink-0"
              >
                Xoá lọc ×
              </button>
            )}
            {allHashtags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveHashtag(activeHashtag === tag ? null : tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors shrink-0 ${
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
      <p className="text-sm text-[#666666] mb-5">
        Hiển thị{' '}
        <span className="font-semibold text-[#1A1A2E]">{filtered.length}</span>{' '}
        tour
        {activeCountry ? ` tại ${activeCountry}` : activeCategory === 'international' ? ' quốc tế' : activeCategory === 'domestic' ? ' trong nước' : ''}
      </p>

      {/* Tour grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F0F7FF] flex items-center justify-center mb-4">
            <MapPin size={28} className="text-[#005BAA]" />
          </div>
          <p className="text-[#666666]">Không tìm thấy tour phù hợp</p>
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
