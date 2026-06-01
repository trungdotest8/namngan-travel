'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import TourListingCard, { type TourListingCardProps } from '@/components/tours/TourListingCard'
import { MapPin } from 'lucide-react'

interface Props {
  tours: TourListingCardProps[]
}

export default function InternationalToursClient({ tours }: Props) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [activeCountry, setActiveCountry] = useState<string | null>(
    searchParams.get('country') ?? null
  )

  // Derive ordered unique countries from tours
  const countries = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    tours.forEach(t => {
      const c = t.country ?? 'Khác'
      if (!seen.has(c)) { seen.add(c); list.push(c) }
    })
    return list.sort((a, b) => a.localeCompare(b, 'vi'))
  }, [tours])

  // Update URL when country changes (shareable link)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeCountry) {
      params.set('country', activeCountry)
    } else {
      params.delete('country')
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [activeCountry, router, searchParams])

  const filtered = useMemo(
    () => activeCountry
      ? tours.filter(t => (t.country ?? 'Khác') === activeCountry)
      : tours,
    [tours, activeCountry]
  )

  return (
    <>
      {/* Country tab strip */}
      {countries.length > 0 && (
        <div className="overflow-x-auto pb-1 mb-6 -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveCountry(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors shrink-0 ${
                !activeCountry
                  ? 'bg-[#005BAA] text-white border-[#005BAA]'
                  : 'bg-white text-[#1A1A2E] border-gray-200 hover:border-[#005BAA] hover:text-[#005BAA]'
              }`}
            >
              Tất cả ({tours.length})
            </button>
            {countries.map(c => {
              const count = tours.filter(t => (t.country ?? 'Khác') === c).length
              return (
                <button
                  key={c}
                  onClick={() => setActiveCountry(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors shrink-0 ${
                    activeCountry === c
                      ? 'bg-[#005BAA] text-white border-[#005BAA]'
                      : 'bg-white text-[#1A1A2E] border-gray-200 hover:border-[#005BAA] hover:text-[#005BAA]'
                  }`}
                >
                  {c} ({count})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tour grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F0F7FF] flex items-center justify-center mb-4">
            <MapPin size={28} className="text-[#005BAA]" />
          </div>
          <p className="text-[#666666]">Không có tour nào cho quốc gia này</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[#666666] mb-5">
            Hiển thị <span className="font-semibold text-[#1A1A2E]">{filtered.length}</span> tour
            {activeCountry ? ` tại ${activeCountry}` : ' quốc tế'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(t => (
              <TourListingCard key={t.id} {...t} />
            ))}
          </div>
        </>
      )}
    </>
  )
}
