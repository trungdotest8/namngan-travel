'use client'

import { useMemo, useState } from 'react'
import TourListingCard, { type TourListingCardProps } from '@/components/tours/TourListingCard'
import HScrollRow from '@/components/tours/HScrollRow'
import { MapPin, X } from 'lucide-react'

interface AffiliateLink {
  id:              string
  provider:        string
  label:           string
  tracking_url:    string
  commission_rate: number
  product_type:    string
}

interface Props {
  tours:      TourListingCardProps[]
  country:    string
  affiliates: AffiliateLink[]
}

const PROVIDER_LOGO: Record<string, string> = {
  booking: '🏨',
  agoda:   '🏩',
  klook:   '🎫',
  airbnb:  '🏠',
  viator:  '🎭',
}

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'departure'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default',    label: 'Mặc định'       },
  { key: 'price_asc',  label: 'Giá thấp → cao' },
  { key: 'price_desc', label: 'Giá cao → thấp' },
  { key: 'departure',  label: 'Ngày khởi hành' },
]

export default function CountryToursClient({ tours, country, affiliates }: Props) {
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
            <span className="font-semibold text-[#1A1A2E]">{sorted.length}</span> tour tại {country}
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
          <p className="font-medium text-[#1A1A2E] mb-1">Không có tour nào</p>
          <p className="text-sm text-[#666666]">Thử xóa bộ lọc hoặc liên hệ tư vấn trực tiếp</p>
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

      {/* ── Affiliate booking section ──────────────────────────────────────── */}
      {affiliates.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">
            Đặt khách sạn & dịch vụ tại {country}
          </h2>
          <p className="text-sm text-[#666666] mb-5">
            So sánh giá và đặt phòng qua các nền tảng uy tín được Nam Ngân Travel giới thiệu.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {affiliates.map(af => (
              <a
                key={af.id}
                href={af.tracking_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100
                           shadow-sm hover:shadow-md hover:border-[#005BAA]/30 transition-all group"
              >
                <span className="text-2xl flex-shrink-0">
                  {PROVIDER_LOGO[af.provider.toLowerCase()] ?? '🔗'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A2E] group-hover:text-[#005BAA] transition-colors truncate">
                    {af.label}
                  </p>
                  <p className="text-xs text-[#666666] mt-0.5 capitalize">{af.provider}</p>
                </div>
                <span className="ml-auto text-xs font-medium text-[#FF6B00] bg-orange-50 px-2 py-0.5 rounded-full shrink-0">
                  Đặt ngay →
                </span>
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            * Nam Ngân Travel có thể nhận hoa hồng khi bạn đặt qua các liên kết trên.
          </p>
        </section>
      )}
    </>
  )
}
