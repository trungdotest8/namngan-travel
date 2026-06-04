'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import TourListingCard, { type TourListingCardProps } from '@/components/tours/TourListingCard'
import { MapPin, SlidersHorizontal, X } from 'lucide-react'

interface Props {
  tours: TourListingCardProps[]
}

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'departure'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default',     label: 'Mặc định'         },
  { key: 'price_asc',   label: 'Giá thấp → cao'   },
  { key: 'price_desc',  label: 'Giá cao → thấp'   },
  { key: 'departure',   label: 'Ngày khởi hành'    },
]

export default function InternationalToursClient({ tours }: Props) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [activeCountry, setActiveCountry] = useState<string | null>(
    searchParams.get('country') ?? null
  )
  const [sort, setSort] = useState<SortKey>('default')
  const [showFilter, setShowFilter] = useState(true)

  // Sync URL ↔ state
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeCountry) params.set('country', activeCountry)
    else               params.delete('country')
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [activeCountry, router, searchParams])

  // Derive ordered unique countries
  const countries = useMemo(() => {
    const map = new Map<string, number>()
    tours.forEach(t => {
      const c = t.country ?? 'Khác'
      map.set(c, (map.get(c) ?? 0) + 1)
    })
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'vi'))
  }, [tours])

  // Filter
  const filtered = useMemo(
    () => activeCountry
      ? tours.filter(t => (t.country ?? 'Khác') === activeCountry)
      : tours,
    [tours, activeCountry]
  )

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    if (sort === 'price_asc')  return arr.sort((a, b) => (a.min_price ?? 0) - (b.min_price ?? 0))
    if (sort === 'price_desc') return arr.sort((a, b) => (b.min_price ?? 0) - (a.min_price ?? 0))
    if (sort === 'departure')  return arr.sort((a, b) => {
      if (!a.next_departure) return 1
      if (!b.next_departure) return -1
      return a.next_departure.localeCompare(b.next_departure)
    })
    return arr
  }, [filtered, sort])

  return (
    <>
      {/* Filter panel */}
      {countries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8">
          {/* Panel header */}
          <button
            onClick={() => setShowFilter(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-[#005BAA]" />
              <span className="text-sm font-semibold text-[#1A1A2E]">Lọc theo quốc gia</span>
              {activeCountry && (
                <span className="ml-1 px-2 py-0.5 bg-[#005BAA] text-white text-xs rounded-full">
                  {activeCountry}
                </span>
              )}
            </div>
            <span className="text-xs text-[#666666]">{showFilter ? 'Thu gọn' : 'Mở rộng'}</span>
          </button>

          {showFilter && (
            <div className="px-5 pb-5">
              <div className="h-px bg-gray-100 mb-4" />

              {/* Wrap-able country buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Tất cả */}
                <button
                  onClick={() => setActiveCountry(null)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    !activeCountry
                      ? 'bg-[#005BAA] text-white border-[#005BAA] shadow-sm'
                      : 'bg-white text-[#1A1A2E] border-gray-200 hover:border-[#005BAA] hover:text-[#005BAA]'
                  }`}
                >
                  Tất cả
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
                    !activeCountry ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#666666]'
                  }`}>
                    {tours.length}
                  </span>
                </button>

                {countries.map(([c, count]) => (
                  <button
                    key={c}
                    onClick={() => setActiveCountry(c === activeCountry ? null : c)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      activeCountry === c
                        ? 'bg-[#005BAA] text-white border-[#005BAA] shadow-sm'
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toolbar: result count + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-[#666666]">
            <span className="font-semibold text-[#1A1A2E]">{sorted.length}</span> tour
            {activeCountry ? ` tại ${activeCountry}` : ' quốc tế'}
          </p>
          {activeCountry && (
            <button
              onClick={() => setActiveCountry(null)}
              className="inline-flex items-center gap-1 text-xs text-[#005BAA] bg-[#F0F7FF] hover:bg-[#005BAA] hover:text-white px-2 py-1 rounded-full transition-colors"
            >
              <X size={11} />
              Xóa lọc
            </button>
          )}
        </div>

        {/* Sort select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#666666] hidden sm:block">Sắp xếp:</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-[#1A1A2E] bg-white focus:outline-none focus:border-[#005BAA] cursor-pointer"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tour grid */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F0F7FF] flex items-center justify-center mb-4">
            <MapPin size={28} className="text-[#005BAA]" />
          </div>
          <p className="font-medium text-[#1A1A2E] mb-1">Không có tour nào</p>
          <p className="text-sm text-[#666666] mb-4">Thử chọn quốc gia khác hoặc xem tất cả tour</p>
          <button
            onClick={() => setActiveCountry(null)}
            className="text-sm font-semibold text-white bg-[#005BAA] px-5 py-2 rounded-full hover:bg-[#0078D7] transition-colors"
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
