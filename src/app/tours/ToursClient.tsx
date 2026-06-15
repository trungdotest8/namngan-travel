'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import TourListingCard, { type TourListingCardProps } from '@/components/tours/TourListingCard'
import HScrollRow from '@/components/tours/HScrollRow'
import { deriveCountry } from '@/lib/tour-country'
import { MapPin, SlidersHorizontal, X } from 'lucide-react'

function normalizeCountry(raw: string | null): string | null {
  if (!raw) return null
  const derived = deriveCountry(raw)
  return derived !== 'Khác' ? derived : raw
}

type CategoryParam = 'international' | 'domestic' | null
type SortKey       = 'default' | 'price_asc' | 'price_desc' | 'departure'

interface Props {
  tours: TourListingCardProps[]
}

const CATEGORY_TABS = [
  { key: null,            label: 'Tất cả'    },
  { key: 'international', label: 'Quốc tế'   },
  { key: 'domestic',      label: 'Trong nước' },
] as const

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default',    label: 'Mặc định'       },
  { key: 'price_asc',  label: 'Giá thấp → cao' },
  { key: 'price_desc', label: 'Giá cao → thấp' },
  { key: 'departure',  label: 'Ngày khởi hành' },
]

function toCategoryParam(value: string | null): CategoryParam {
  if (value === 'international')                         return 'international'
  if (value === 'domestic')                              return 'domestic'
  if (value === 'nước ngoài' || value === 'quốc tế')    return 'international'
  if (value === 'trong nước')                            return 'domestic'
  return null
}

export default function ToursClient({ tours }: Props) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [activeCategory, setActiveCategory] = useState<CategoryParam>(
    toCategoryParam(searchParams.get('category'))
  )
  const [activeCountry,  setActiveCountry]  = useState<string | null>(
    normalizeCountry(searchParams.get('country'))
  )
  const [activeHashtag,  setActiveHashtag]  = useState<string | null>(null)
  const [sort,           setSort]           = useState<SortKey>('default')
  const [showFilter,     setShowFilter]     = useState(true)

  // Sync URL ↔ state
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeCategory) params.set('category', activeCategory)
    else                params.delete('category')
    if (activeCountry && activeCategory === 'international') params.set('country', activeCountry)
    else                                                     params.delete('country')
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [activeCategory, activeCountry, router, searchParams])

  function handleCategoryChange(cat: CategoryParam) {
    setActiveCategory(cat)
    if (cat !== 'international') setActiveCountry(null)
    setActiveHashtag(null)
  }

  function handleCountryChange(c: string | null) {
    setActiveCountry(c)
    setActiveHashtag(null)
  }

  // Category filter
  const categoryFiltered = useMemo(() => {
    if (activeCategory === 'international') return tours.filter(t => t.category === 'nước ngoài')
    if (activeCategory === 'domestic')      return tours.filter(t => t.category === 'trong nước')
    return tours
  }, [tours, activeCategory])

  // Countries list (international only)
  const countries = useMemo(() => {
    if (activeCategory !== 'international') return []
    const map = new Map<string, number>()
    categoryFiltered.forEach(t => {
      const c = t.country ?? 'Khác'
      map.set(c, (map.get(c) ?? 0) + 1)
    })
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'vi'))
  }, [categoryFiltered, activeCategory])

  // Hashtags from category+country filtered set
  const allHashtags = useMemo(() => {
    const base = activeCategory === 'international' && activeCountry
      ? categoryFiltered.filter(t => (t.country ?? 'Khác') === activeCountry)
      : categoryFiltered
    const seen = new Set<string>()
    base.forEach(t => (t.hashtags ?? []).forEach(h => seen.add(h)))
    return [...seen].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [categoryFiltered, activeCategory, activeCountry])

  // Full filter chain
  const filtered = useMemo(() => {
    let result = categoryFiltered
    if (activeCategory === 'international' && activeCountry)
      result = result.filter(t => (t.country ?? 'Khác') === activeCountry)
    if (activeHashtag)
      result = result.filter(t => (t.hashtags ?? []).includes(activeHashtag))
    return result
  }, [categoryFiltered, activeCategory, activeCountry, activeHashtag])

  // Sort
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

  const intlCount     = useMemo(() => tours.filter(t => t.category === 'nước ngoài').length, [tours])
  const domesticCount = useMemo(() => tours.filter(t => t.category === 'trong nước').length,  [tours])

  return (
    <>
      {/* ── Category tabs ──────────────────────────────────────────────────── */}
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

      {/* ── Country filter panel (international only) ─────────────────────── */}
      {activeCategory === 'international' && countries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
          <button
            onClick={() => setShowFilter(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-[#005BAA]" />
              <span className="text-sm font-semibold text-[#1A1A2E]">Lọc theo quốc gia</span>
              {activeCountry && (
                <span className="px-2.5 py-0.5 bg-[#005BAA] text-white text-xs font-medium rounded-full">
                  {activeCountry}
                </span>
              )}
            </div>
            <span className="text-xs text-[#666666]">{showFilter ? 'Thu gọn' : 'Mở rộng'}</span>
          </button>

          {showFilter && (
            <div className="px-5 pb-4">
              <div className="h-px bg-gray-100 mb-3" />
              <HScrollRow>
                <button
                  onClick={() => handleCountryChange(null)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    !activeCountry
                      ? 'bg-[#005BAA] text-white border-[#005BAA]'
                      : 'bg-white text-[#1A1A2E] border-gray-200 hover:border-[#005BAA] hover:text-[#005BAA]'
                  }`}
                >
                  Tất cả quốc gia
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
                    !activeCountry ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#666666]'
                  }`}>
                    {categoryFiltered.length}
                  </span>
                </button>

                {countries.map(([c, count]) => (
                  <button
                    key={c}
                    onClick={() => handleCountryChange(c === activeCountry ? null : c)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      activeCountry === c
                        ? 'bg-[#005BAA] text-white border-[#005BAA]'
                        : 'bg-white text-[#1A1A2E] border-gray-200 hover:border-[#005BAA] hover:text-[#005BAA]'
                    }`}
                  >
                    {c}
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
                      activeCountry === c ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#666666]'
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </HScrollRow>
            </div>
          )}
        </div>
      )}

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
            Hiển thị{' '}
            <span className="font-semibold text-[#1A1A2E]">{sorted.length}</span> tour
            {activeCountry    ? ` tại ${activeCountry}`
              : activeCategory === 'international' ? ' quốc tế'
              : activeCategory === 'domestic'      ? ' trong nước'
              : ''}
            {activeHashtag ? ` · ${activeHashtag}` : ''}
          </p>
          {(activeCountry || activeHashtag) && (
            <button
              onClick={() => { handleCountryChange(null); setActiveHashtag(null) }}
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
          <p className="text-[#666666]">Không tìm thấy tour phù hợp</p>
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
