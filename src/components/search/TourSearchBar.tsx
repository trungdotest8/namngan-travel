'use client'

import { type ReactNode, useState } from 'react'
import {
  MapPin, Route, Navigation, Calendar,
  Users, Search, Plus, Minus, ChevronDown, ChevronUp,
} from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useSearchStore } from '@/store/search.store'
import { SearchCriteriaSchema } from '@/lib/validations/search.schema'

// ── Static data ───────────────────────────────────────────────
// Production: thay bằng Supabase query:
//   supabase.from('tours').select('name, destination, category').eq('is_active', true)

const DESTINATIONS = [
  {
    group: 'Nước ngoài',
    category: 'nước ngoài' as const,
    items: [
      'Trung Quốc', 'Nhật Bản', 'Hàn Quốc', 'Đài Loan', 'Thái Lan',
      'Singapore', 'Malaysia', 'Indonesia', 'Campuchia', 'Pháp', 'Ý', 'Đức', 'Thụy Sĩ', 'Mỹ',
    ],
  },
  {
    group: 'Trong nước',
    category: 'trong nước' as const,
    items: [
      'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hội An', 'Huế',
      'Nha Trang', 'Phú Quốc', 'Đà Lạt', 'Hạ Long', 'Sapa', 'Mù Cang Chải',
    ],
  },
]

const TOUR_NAMES: Record<string, string[]> = {
  'Trung Quốc': [
    'Bắc Kinh – Vạn Lý Trường Thành – Tử Cấm Thành 6N5Đ',
    'Thượng Hải – Tô Châu – Hàng Châu 5N4Đ',
    'Quảng Châu – Thâm Quyến – Chu Hải 4N3Đ',
    'Trương Gia Giới – Phượng Hoàng Cổ Trấn 6N5Đ',
    'Hải Nam – Tam Á Resort 5N4Đ',
  ],
  'Nhật Bản': [
    'Tokyo – Osaka – Kyoto – Nara 7N6Đ',
    'Tokyo – Núi Phú Sĩ – Hokkaido 8N7Đ',
    'Osaka – Hiroshima – Nara 6N5Đ',
  ],
  'Hàn Quốc': ['Seoul – Busan – Đảo Jeju 6N5Đ', 'Seoul – Gyeongju – Busan 5N4Đ'],
  'Đài Loan': ['Đài Bắc – Đài Trung – Cao Hùng 5N4Đ', 'Đài Bắc – Hoa Liên – Gia Nghĩa 6N5Đ'],
  'Thái Lan': ['Bangkok – Pattaya – Phuket 5N4Đ', 'Bangkok – Chiang Mai – Pai 6N5Đ', 'Bangkok City Tour 4N3Đ'],
  'Singapore': ['Singapore – Gardens by the Bay – Sentosa 4N3Đ', 'Singapore – Malaysia 5N4Đ'],
  'Malaysia': ['Kuala Lumpur – Genting – Malacca 5N4Đ'],
  'Campuchia': ['Siem Reap – Angkor Wat 4N3Đ', 'Phnom Penh – Siem Reap 5N4Đ'],
  'Pháp': ['Paris – Nice – Lyon – Bordeaux 9N8Đ', 'Paris – Versailles – Normandy 8N7Đ'],
  'Ý': ['Rome – Florence – Venice – Milan 10N9Đ', 'Rome – Naples – Amalfi 8N7Đ'],
  'Mỹ': ['New York – Washington – Las Vegas – Los Angeles 12N11Đ', 'California – Grand Canyon – Hawaii 10N9Đ'],
  'Đà Lạt': ['Đà Lạt City Tour – Thung Lũng Tình Yêu 3N2Đ', 'Đà Lạt – Nha Trang 4N3Đ', 'Đà Lạt Mùa Hoa 2N1Đ'],
  'Phú Quốc': ['Phú Quốc Toàn Đảo 4N3Đ', 'Phú Quốc – Bắc Đảo – Nam Đảo 3N2Đ', 'Phú Quốc Nghỉ Dưỡng Resort 5N4Đ'],
  'Nha Trang': ['Nha Trang – 4 Đảo 3N2Đ', 'Nha Trang – Đà Lạt 5N4Đ'],
  'Hạ Long': ['Hạ Long – Du Thuyền 2N1Đ', 'Hạ Long – Ninh Bình 3N2Đ'],
  'Sapa': ['Sapa – Fansipan – Bản Cát Cát 3N2Đ', 'Sapa – Mù Cang Chải 4N3Đ'],
  'Hội An': ['Hội An – Đà Nẵng – Bà Nà Hills 4N3Đ', 'Hội An – Mỹ Sơn – Huế 5N4Đ'],
}

const DEFAULT_TOURS = ['Tuyến tiêu chuẩn', 'Tuyến cao cấp', 'Tuyến trọn gói']

// tour_schedules.meeting_point
const MEETING_POINTS = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ',
  'Hải Phòng', 'Nha Trang', 'Huế', 'Buôn Ma Thuột',
]

// ── Sub-components ────────────────────────────────────────────

function CounterField({
  label, sub, value, onChange, min = 0,
}: {
  label: string; sub: string; value: number; onChange: (v: number) => void; min?: number
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
          aria-label={`Giảm ${label}`}
        >
          <Minus size={14} />
        </button>
        <span className="w-5 text-center text-sm font-semibold text-text-primary">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
          aria-label={`Tăng ${label}`}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

interface TourSearchBarProps {
  onSearch?: (criteria: ReturnType<typeof SearchCriteriaSchema.parse>) => void
  compact?: boolean
}

function TourSearchBarInner({ onSearch }: TourSearchBarProps) {
  const { criteria, setCriteria, isSearching, setSearching, setError } = useSearchStore()
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)
  const [passengerOpen, setPassengerOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const today = new Date().toISOString().split('T')[0]
  const availableTours = TOUR_NAMES[criteria.destination] ?? DEFAULT_TOURS

  const passengerLabel = (() => {
    let s = `${criteria.adults} người lớn`
    if (criteria.children) s += `, ${criteria.children} trẻ em`
    return s
  })()

  const handleDestinationChange = (dest: string) => {
    const group = DESTINATIONS.find((g) => g.items.includes(dest))
    setCriteria({ destination: dest, category: group?.category ?? '', tourName: '' })
  }

  const handleSearch = async () => {
    setFieldErrors({})
    const result = SearchCriteriaSchema.safeParse({
      category:      criteria.category,
      destination:   criteria.destination,
      tourName:      criteria.tourName,
      meetingPoint:  criteria.meetingPoint,
      departureDate: criteria.departureDate,
      adults:        criteria.adults,
      children:      criteria.children,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        errs[String(err.path[0])] = err.message
      })
      setFieldErrors(errs)
      return
    }
    setSearching(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      })
      if (!res.ok) throw new Error('Tìm kiếm thất bại')
      const data = await res.json()
      onSearch?.(result.data)
      useSearchStore.getState().setResults(data.tours ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi')
    }
  }

  const toggleAccordion = (id: string) =>
    setOpenAccordion((prev) => (prev === id ? null : id))

  // Accordion config (mobile)
  const accordionItems: Array<{
    id: string
    icon: React.ElementType
    label: string
    display: string
    hasValue: boolean
    error?: string
    content: ReactNode
  }> = [
    {
      id: 'destination',
      icon: MapPin,
      label: 'Điểm đến',
      display: criteria.destination || 'Chọn điểm đến',
      hasValue: !!criteria.destination,
      error: fieldErrors.destination,
      content: (
        <select
          value={criteria.destination}
          onChange={(e) => { handleDestinationChange(e.target.value); setOpenAccordion(null) }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-blue"
        >
          <option value="" disabled>Chọn điểm đến</option>
          {DESTINATIONS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((i) => <option key={i} value={i}>{i}</option>)}
            </optgroup>
          ))}
        </select>
      ),
    },
    {
      id: 'tourName',
      icon: Route,
      label: 'Tuyến du lịch',
      display: criteria.tourName || 'Chọn tuyến',
      hasValue: !!criteria.tourName,
      content: (
        <select
          value={criteria.tourName}
          onChange={(e) => { setCriteria({ tourName: e.target.value }); setOpenAccordion(null) }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-blue"
        >
          <option value="" disabled>Chọn tuyến</option>
          {availableTours.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      ),
    },
    {
      id: 'meetingPoint',
      icon: Navigation,
      label: 'Nơi xuất phát',
      display: criteria.meetingPoint || 'Linh hoạt',
      hasValue: !!criteria.meetingPoint,
      content: (
        <select
          value={criteria.meetingPoint}
          onChange={(e) => { setCriteria({ meetingPoint: e.target.value }); setOpenAccordion(null) }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-blue"
        >
          <option value="">Linh hoạt</option>
          {MEETING_POINTS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      ),
    },
    {
      id: 'departureDate',
      icon: Calendar,
      label: 'Ngày đi',
      display: criteria.departureDate || 'Chọn ngày',
      hasValue: !!criteria.departureDate,
      error: fieldErrors.departureDate,
      content: (
        <input
          type="date"
          value={criteria.departureDate}
          min={today}
          onChange={(e) => { setCriteria({ departureDate: e.target.value }); setOpenAccordion(null) }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-blue"
        />
      ),
    },
    {
      id: 'passengers',
      icon: Users,
      label: 'Hành khách',
      display: passengerLabel,
      hasValue: true,
      content: (
        <div className="border border-gray-200 rounded-lg px-4 divide-y divide-gray-100">
          <CounterField
            label="Người lớn" sub="Từ 12 tuổi trở lên"
            value={criteria.adults} min={1}
            onChange={(v) => setCriteria({ adults: v })}
          />
          <CounterField
            label="Trẻ em" sub="2 – 11 tuổi"
            value={criteria.children}
            onChange={(v) => setCriteria({ children: v })}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="w-full font-sans">

      {/* ── DESKTOP: Horizontal Search Bar (md+) ── */}
      <div className="hidden md:flex items-stretch bg-white rounded-2xl shadow-xl border border-gray-100 overflow-visible">

        {/* Điểm đến */}
        <div className="flex-1 min-w-0 px-5 py-4 border-r border-gray-100">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
            <MapPin size={13} className="text-brand-blue" /> Điểm đến
          </label>
          <div className="relative">
            <select
              value={criteria.destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              className="w-full appearance-none bg-transparent text-sm font-medium text-text-primary border-0 outline-none cursor-pointer pr-5 truncate"
            >
              <option value="" disabled>Chọn điểm đến</option>
              {DESTINATIONS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((i) => <option key={i} value={i}>{i}</option>)}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {fieldErrors.destination && <p className="text-xs text-red-500 mt-1">{fieldErrors.destination}</p>}
        </div>

        {/* Tuyến du lịch */}
        <div className="flex-[1.4] min-w-0 px-5 py-4 border-r border-gray-100">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
            <Route size={13} className="text-brand-blue" /> Tuyến du lịch
          </label>
          <div className="relative">
            <select
              value={criteria.tourName}
              onChange={(e) => setCriteria({ tourName: e.target.value })}
              className="w-full appearance-none bg-transparent text-sm font-medium text-text-primary border-0 outline-none cursor-pointer pr-5 truncate"
            >
              <option value="" disabled>Chọn tuyến</option>
              {availableTours.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Nơi xuất phát */}
        <div className="flex-1 min-w-0 px-5 py-4 border-r border-gray-100">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
            <Navigation size={13} className="text-brand-blue" /> Nơi xuất phát
          </label>
          <div className="relative">
            <select
              value={criteria.meetingPoint}
              onChange={(e) => setCriteria({ meetingPoint: e.target.value })}
              className="w-full appearance-none bg-transparent text-sm font-medium text-text-primary border-0 outline-none cursor-pointer pr-5 truncate"
            >
              <option value="">Linh hoạt</option>
              {MEETING_POINTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Ngày đi */}
        <div className="flex-[0.8] min-w-0 px-5 py-4 border-r border-gray-100">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
            <Calendar size={13} className="text-brand-blue" /> Ngày đi
          </label>
          <input
            type="date"
            value={criteria.departureDate}
            min={today}
            onChange={(e) => setCriteria({ departureDate: e.target.value })}
            className="w-full bg-transparent text-sm font-medium text-text-primary border-0 outline-none cursor-pointer"
          />
          {fieldErrors.departureDate && <p className="text-xs text-red-500 mt-1">{fieldErrors.departureDate}</p>}
        </div>

        {/* Hành khách */}
        <div className="flex-1 min-w-0 px-5 py-4 border-r border-gray-100 relative">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
            <Users size={13} className="text-brand-blue" /> Hành khách
          </label>
          <button
            type="button"
            onClick={() => setPassengerOpen((v) => !v)}
            className="flex items-center gap-1 w-full text-sm font-medium text-text-primary text-left outline-none"
          >
            <span className="truncate">{passengerLabel}</span>
            <ChevronDown
              size={14}
              className={`text-gray-400 flex-shrink-0 transition-transform ${passengerOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {passengerOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 px-4 py-2 z-50 divide-y divide-gray-100">
              <CounterField
                label="Người lớn" sub="Từ 12 tuổi trở lên"
                value={criteria.adults} min={1}
                onChange={(v) => setCriteria({ adults: v })}
              />
              <CounterField
                label="Trẻ em" sub="2 – 11 tuổi"
                value={criteria.children}
                onChange={(v) => setCriteria({ children: v })}
              />
              <div className="pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => setPassengerOpen(false)}
                  className="w-full text-xs text-brand-blue font-semibold py-1 hover:text-brand-light"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nút tìm kiếm */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="flex items-center gap-2 bg-brand-blue hover:bg-brand-light active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-7 m-2 rounded-xl transition-all duration-150 whitespace-nowrap"
        >
          <Search size={16} />
          {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
        </button>
      </div>

      {/* ── MOBILE: Vertical Accordion (below md) ── */}
      <div className="md:hidden bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {accordionItems.map((item) => {
          const Icon = item.icon
          const isOpen = openAccordion === item.id
          return (
            <div key={item.id} className="border-b border-gray-100 last:border-0">
              <button
                type="button"
                onClick={() => toggleAccordion(item.id)}
                className="flex items-center justify-between w-full px-4 py-3.5 text-left min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className="text-brand-blue flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide leading-none mb-0.5">
                      {item.label}
                    </p>
                    <p className={`text-sm font-medium leading-snug ${item.hasValue ? 'text-text-primary' : 'text-gray-400'}`}>
                      {item.display}
                    </p>
                  </div>
                </div>
                {isOpen
                  ? <ChevronUp size={16} className="text-gray-400" />
                  : <ChevronDown size={16} className="text-gray-400" />
                }
              </button>
              {item.error && <p className="px-4 pb-1 text-xs text-red-500">{item.error}</p>}
              {isOpen && <div className="px-4 pb-4">{item.content}</div>}
            </div>
          )
        })}
        <div className="p-3">
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="flex items-center justify-center gap-2 w-full bg-brand-blue hover:bg-brand-light active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-150 min-h-[44px]"
          >
            <Search size={16} />
            {isSearching ? 'Đang tìm...' : 'Tìm kiếm tour'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TourSearchBar(props: TourSearchBarProps) {
  return (
    <ErrorBoundary moduleName="TourSearchBar">
      <TourSearchBarInner {...props} />
    </ErrorBoundary>
  )
}
