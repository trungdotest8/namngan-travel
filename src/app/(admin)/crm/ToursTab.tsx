'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Pencil, Trash2, Loader2, AlertCircle,
  CheckCircle2, X, Image as ImageIcon, Hash, Globe, MapPin,
  Eye, EyeOff, Upload, Images, ChevronUp, ChevronDown, CalendarDays,
} from 'lucide-react'
import type { Tour, TourItineraryDay } from '@/types/tour.types'
import { COUNTRY_MAP } from '@/lib/tour-country'
import TourGalleryManager from '@/components/crm/TourGalleryManager'


const COUNTRIES = Object.keys(COUNTRY_MAP).sort()

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'trong nước', label: 'Trong nước' },
  { value: 'nước ngoài', label: 'Nước ngoài' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterCat = 'all' | 'trong nước' | 'nước ngoài'

interface TourFormState {
  name:          string
  code:          string
  slug:          string
  destination:   string
  country:       string
  category:      string
  duration_days: string
  description:   string
  highlights:    string
  itinerary:     TourItineraryDay[]
  thumbnail_url: string
  gallery_urls:  string[]
  hashtags:      string   // comma-separated input
  is_active:     boolean
}

const EMPTY_FORM: TourFormState = {
  name:          '',
  code:          '',
  slug:          '',
  destination:   '',
  country:       '',
  category:      'trong nước',
  duration_days: '',
  description:   '',
  highlights:    '',
  itinerary:     [],
  thumbnail_url: '',
  gallery_urls:  [],
  hashtags:      '',
  is_active:     true,
}

function tourToForm(t: Tour): TourFormState {
  return {
    name:          t.name,
    code:          t.code,
    slug:          t.slug,
    destination:   t.destination ?? '',
    country:       t.country ?? '',
    category:      t.category ?? 'trong nước',
    duration_days: t.duration_days != null ? String(t.duration_days) : '',
    description:   t.description ?? '',
    highlights:    t.highlights ?? '',
    itinerary:     t.itinerary ?? [],
    thumbnail_url: t.thumbnail_url ?? '',
    gallery_urls:  t.gallery_urls ?? [],
    hashtags:      (t.hashtags ?? []).join(', '),
    is_active:     t.is_active,
  }
}

function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold text-[#005BAA] uppercase tracking-widest mb-3 mt-5 flex items-center gap-2">
      <div className="h-px flex-1 bg-blue-100" />
      {children}
      <div className="h-px flex-1 bg-blue-100" />
    </div>
  )
}

// ── ImageUploadInput ──────────────────────────────────────────────────────────

function ImageUploadInput({ onUploadSuccess }: { onUploadSuccess: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Kích thước ảnh không được vượt quá 5MB')
      return
    }
    setUploading(true)
    setUploadError(null)
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string
        const res = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, fileName: file.name, fileType: file.type }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Upload thất bại')
        onUploadSuccess(result.url)
        if (inputRef.current) inputRef.current.value = ''
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi upload ảnh')
      } finally {
        setUploading(false)
      }
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-[#005BAA]/40 rounded-lg cursor-pointer hover:bg-[#F0F7FF] transition-colors w-full">
        {uploading
          ? <Loader2 size={12} className="animate-spin text-[#0078D7]" />
          : <Upload size={12} className="text-[#005BAA]" />
        }
        <span className="text-xs text-[#005BAA] font-medium">
          {uploading ? 'Đang tải lên...' : 'Tải ảnh từ máy tính (≤5MB)'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {uploadError && (
        <p className="text-[10.5px] text-red-500 flex items-center gap-1">
          <AlertCircle size={10} /> {uploadError}
        </p>
      )}
    </div>
  )
}

// ── ItineraryEditor ───────────────────────────────────────────────────────────

const MEAL_OPTIONS = ['Sáng', 'Trưa', 'Tối']

function ItineraryEditor({
  days,
  onChange,
}: {
  days: TourItineraryDay[]
  onChange: (days: TourItineraryDay[]) => void
}) {
  function addDay() {
    onChange([...days, { day: days.length + 1, title: '', description: '', meals: [], images: [] }])
  }

  function removeDay(idx: number) {
    onChange(days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, day: i + 1 })))
  }

  function moveDay(idx: number, dir: -1 | 1) {
    const next = [...days]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next.map((d, i) => ({ ...d, day: i + 1 })))
  }

  function updateDay(idx: number, patch: Partial<TourItineraryDay>) {
    onChange(days.map((d, i) => i === idx ? { ...d, ...patch } : d))
  }

  function toggleMeal(idx: number, meal: string) {
    const cur = days[idx].meals ?? []
    updateDay(idx, { meals: cur.includes(meal) ? cur.filter(m => m !== meal) : [...cur, meal] })
  }

  function addDayImage(idx: number, url: string) {
    updateDay(idx, { images: [...(days[idx].images ?? []), url] })
  }

  function removeDayImage(dayIdx: number, imgIdx: number) {
    updateDay(dayIdx, { images: (days[dayIdx].images ?? []).filter((_, i) => i !== imgIdx) })
  }

  return (
    <div className="space-y-3">
      {days.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center text-xs text-gray-400">
          <CalendarDays size={20} className="mx-auto mb-1.5 text-gray-300" />
          Chưa có lịch trình — nhấn &quot;+ Thêm ngày&quot; để bắt đầu
        </div>
      )}

      {days.map((day, idx) => (
        <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Day header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#F0F7FF] border-b border-blue-100">
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#005BAA] text-white text-[11px] font-bold flex-shrink-0">
              {day.day}
            </span>
            <input
              value={day.title}
              onChange={e => updateDay(idx, { title: e.target.value })}
              placeholder={`Tiêu đề ngày ${day.day}...`}
              className="flex-1 bg-transparent text-xs font-semibold text-[#1A1A2E] outline-none placeholder:text-gray-400 placeholder:font-normal"
            />
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => moveDay(idx, -1)}
                disabled={idx === 0}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-[#005BAA] disabled:opacity-25 transition-colors"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => moveDay(idx, 1)}
                disabled={idx === days.length - 1}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-[#005BAA] disabled:opacity-25 transition-colors"
              >
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => removeDay(idx)}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          </div>

          {/* Day body */}
          <div className="px-3 py-2.5 space-y-2.5">
            {/* Meals */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-12 flex-shrink-0">Bữa ăn</span>
              {MEAL_OPTIONS.map(meal => (
                <label key={meal} className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={(day.meals ?? []).includes(meal)}
                    onChange={() => toggleMeal(idx, meal)}
                    className="w-3 h-3 accent-[#005BAA]"
                  />
                  {meal}
                </label>
              ))}
            </div>

            {/* Description */}
            <textarea
              value={day.description}
              onChange={e => updateDay(idx, { description: e.target.value })}
              rows={4}
              placeholder="Mô tả hoạt động, điểm tham quan, ghi chú..."
              className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:border-[#005BAA] outline-none resize-y leading-relaxed"
            />

            {/* Day images */}
            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Ảnh ngày {day.day} ({(day.images ?? []).length})
              </div>
              <ImageUploadInput onUploadSuccess={url => addDayImage(idx, url)} />
              {(day.images ?? []).length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  {(day.images ?? []).map((url, imgIdx) => (
                    <div key={imgIdx} className="relative group rounded-md overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <button
                        type="button"
                        onClick={() => removeDayImage(idx, imgIdx)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={8} />
                      </button>
                      <div className="absolute bottom-0.5 left-0.5 text-[8px] text-white/80 bg-black/40 px-1 rounded">
                        {imgIdx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addDay}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-[#005BAA]/30 rounded-xl text-xs text-[#005BAA] font-medium hover:border-[#005BAA]/60 hover:bg-[#F0F7FF] transition-colors"
      >
        <Plus size={12} /> Thêm ngày {days.length + 1}
      </button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ToursTab() {
  const [tours, setTours]           = useState<Tour[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [filterCat, setFilterCat]   = useState<FilterCat>('all')
  const [search, setSearch]         = useState('')

  const [panelOpen, setPanelOpen]   = useState(false)
  const [editing, setEditing]       = useState<Tour | null>(null)
  const [form, setForm]             = useState<TourFormState>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)

  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  const [galleryTour, setGalleryTour] = useState<Tour | null>(null)

  const [galleryInput, setGalleryInput] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [toast, setToast]           = useState<string | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────

  const fetchTours = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ is_active: 'all', limit: '500' })
      const res = await fetch(`/api/tours?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setTours(json.tours ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách tour')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTours() }, [fetchTours])

  // ── Filtered list ──────────────────────────────────────────────

  const filtered = tours.filter(t => {
    if (filterCat !== 'all' && t.category !== filterCat) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !(t.destination ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // ── Toast ──────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Panel ──────────────────────────────────────────────────────

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSlugManual(false)
    setGalleryInput('')
    setSaveError(null)
    setPanelOpen(true)
  }

  function openEdit(t: Tour) {
    setEditing(t)
    setForm(tourToForm(t))
    setSlugManual(true)
    setGalleryInput('')
    setSaveError(null)
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditing(null)
    setSaveError(null)
  }

  // ── Form fields ────────────────────────────────────────────────

  function onField<K extends keyof TourFormState>(key: K, value: TourFormState[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'name' && !slugManual) {
        next.slug = toSlug(value as string)
      }
      return next
    })
  }

  // ── Gallery management ─────────────────────────────────────────

  function addGalleryUrl() {
    const url = galleryInput.trim()
    if (!url) return
    try { new URL(url) } catch { setSaveError('URL ảnh không hợp lệ'); return }
    if (form.gallery_urls.includes(url)) { setSaveError('URL đã có trong thư viện'); return }
    setSaveError(null)
    setForm(prev => ({ ...prev, gallery_urls: [...prev.gallery_urls, url] }))
    setGalleryInput('')
  }

  function removeGalleryUrl(idx: number) {
    setForm(prev => ({
      ...prev,
      gallery_urls: prev.gallery_urls.filter((_, i) => i !== idx),
    }))
  }

  // ── Save ───────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) { setSaveError('Tên tour là bắt buộc'); return }
    if (!form.code.trim()) { setSaveError('Mã tour là bắt buộc'); return }

    setSaving(true)
    setSaveError(null)
    try {
      const hashtagsArr = form.hashtags
        .split(',')
        .map(h => h.trim())
        .filter(Boolean)

      const body = {
        name:          form.name.trim(),
        code:          form.code.trim().toUpperCase(),
        slug:          form.slug || toSlug(form.name),
        destination:   form.destination.trim() || null,
        country:       form.country || null,
        category:      form.category || null,
        duration_days: form.duration_days ? parseInt(form.duration_days, 10) : null,
        description:   form.description.trim() || null,
        highlights:    form.highlights.trim() || null,
        itinerary:     form.itinerary.length > 0 ? form.itinerary : null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        gallery_urls:  form.gallery_urls,
        hashtags:      hashtagsArr,
        is_active:     form.is_active,
      }

      let res: Response
      if (editing) {
        res = await fetch(`/api/tours/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json'},
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/tours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json'},
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }

      await fetchTours()
      closePanel()
      showToast(editing ? 'Đã cập nhật tour' : 'Đã tạo tour mới')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Không thể lưu')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle active ──────────────────────────────────────────────

  async function toggleActive(tour: Tour) {
    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ is_active: !tour.is_active }),
      })
      if (!res.ok) throw new Error('Lỗi cập nhật')
      setTours(prev => prev.map(t => t.id === tour.id ? { ...t, is_active: !t.is_active } : t))
    } catch {
      showToast('Không thể thay đổi trạng thái')
    }
  }

  // ── Delete ─────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tours/${deleteId}?hard=true`, {
        method: 'DELETE',
        headers: {},
      })
      if (!res.ok) throw new Error('Xóa thất bại')
      setTours(prev => prev.filter(t => t.id !== deleteId))
      setDeleteId(null)
      showToast('Đã xóa tour')
    } catch {
      showToast('Không thể xóa tour')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  const filterTabs: { key: FilterCat; label: string; count: number }[] = [
    { key: 'all',        label: 'Tất cả',      count: tours.length },
    { key: 'trong nước', label: 'Trong nước',   count: tours.filter(t => t.category === 'trong nước').length },
    { key: 'nước ngoài', label: 'Nước ngoài',   count: tours.filter(t => t.category === 'nước ngoài').length },
  ]

  return (
    <div className="relative flex flex-col lg:flex-row gap-5">

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#1A1A2E] text-white text-sm rounded-xl shadow-lg">
          <CheckCircle2 size={15} className="text-green-400 flex-shrink-0" />
          {toast}
        </div>
      )}

      {/* ── Left: list ── */}
      <div className={`flex-1 min-w-0 transition-all ${panelOpen ? 'lg:max-w-[calc(100%-420px)]' : ''}`}>

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-4 gap-3">
          <div className="min-w-0">
            <div className="font-bold text-xl text-[#1A1A2E]">Quản lý Tour</div>
            <div className="text-sm text-gray-400 mt-0.5 hidden sm:block">
              CRUD hình ảnh, hashtag, thông tin tour trong nước &amp; nước ngoài
            </div>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#005BAA] text-white text-xs font-medium hover:bg-[#0078D7] transition-colors flex-shrink-0"
          >
            <Plus size={13} /> Thêm tour
          </button>
        </div>

        {/* Filter tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
          <div className="flex border-b border-gray-200 overflow-x-auto flex-1">
            {filterTabs.map(f => (
              <button
                key={f.key}
                onClick={() => setFilterCat(f.key)}
                className={`px-3 py-2 text-[12.5px] font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  filterCat === f.key
                    ? 'border-[#005BAA] text-[#005BAA]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  filterCat === f.key ? 'bg-[#F0F7FF] text-[#005BAA]' : 'bg-gray-100 text-gray-500'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Tìm tour..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-full sm:w-44 focus:border-[#005BAA] outline-none bg-gray-50"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={14} />
            <span>{error}</span>
            <button onClick={fetchTours} className="ml-auto text-xs underline">Thử lại</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase w-16">Ảnh</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase">Tên tour</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase w-28 hidden lg:table-cell">Điểm đến</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase w-24 hidden xl:table-cell">Loại</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase hidden xl:table-cell">Hashtags</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase w-20">Trạng thái</th>
                  <th className="py-2.5 px-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                      {search ? 'Không tìm thấy tour' : 'Chưa có tour nào'}
                    </td>
                  </tr>
                )}
                {filtered.map(tour => (
                  <tr key={tour.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    {/* Thumbnail */}
                    <td className="py-2 px-3">
                      {tour.thumbnail_url ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element -- admin table thumbnail, dynamic URL + onError handler */}
                          <img
                            src={tour.thumbnail_url}
                            alt={tour.name}
                            className="w-14 h-9 object-cover rounded-md bg-gray-100"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          {(tour.gallery_urls?.length ?? 0) > 0 && (
                            <span className="absolute -bottom-1 -right-1 bg-[#005BAA] text-white text-[9px] rounded-full px-1 leading-tight font-bold">
                              +{tour.gallery_urls!.length}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-14 h-9 bg-gray-100 rounded-md flex items-center justify-center">
                          <ImageIcon size={14} className="text-gray-300" />
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="py-2 px-3">
                      <div className="font-medium text-[#1A1A2E] text-[12px] line-clamp-1">{tour.name}</div>
                      <div className="text-[10.5px] text-gray-400 font-mono">{tour.code}</div>
                    </td>

                    {/* Destination */}
                    <td className="py-2 px-3 hidden lg:table-cell">
                      <div className="text-[11px] text-gray-600 line-clamp-1">{tour.destination ?? '—'}</div>
                      {tour.duration_days && (
                        <div className="text-[10px] text-gray-400">{tour.duration_days}N</div>
                      )}
                    </td>

                    {/* Category badge */}
                    <td className="py-2 px-3 hidden xl:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                        tour.category === 'trong nước'
                          ? 'bg-[#F0F7FF] text-[#005BAA]'
                          : 'bg-orange-50 text-orange-700'
                      }`}>
                        {tour.category === 'nước ngoài' ? <Globe size={9} /> : <MapPin size={9} />}
                        {tour.category === 'trong nước' ? 'Trong nước' : 'Nước ngoài'}
                      </span>
                    </td>

                    {/* Hashtags */}
                    <td className="py-2 px-3 hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(tour.hashtags ?? []).slice(0, 3).map(tag => (
                          <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[9.5px] rounded font-medium">
                            <Hash size={8} />{tag.replace(/^#/, '')}
                          </span>
                        ))}
                        {(tour.hashtags ?? []).length > 3 && (
                          <span className="text-[9.5px] text-gray-400">+{tour.hashtags!.length - 3}</span>
                        )}
                        {(tour.hashtags ?? []).length === 0 && (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </div>
                    </td>

                    {/* Active toggle */}
                    <td className="py-2 px-3">
                      <button
                        onClick={() => toggleActive(tour)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                          tour.is_active
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title={tour.is_active ? 'Đang hiện — click để ẩn' : 'Đang ẩn — click để hiện'}
                      >
                        {tour.is_active ? <Eye size={9} /> : <EyeOff size={9} />}
                        {tour.is_active ? 'Hiện' : 'Ẩn'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setGalleryTour(tour)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Quản lý ảnh gallery"
                        >
                          <Images size={12} />
                        </button>
                        <button
                          onClick={() => openEdit(tour)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-50 text-gray-400 hover:text-[#005BAA] transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteId(tour.id)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Right: Slide-over panel ── */}
      {panelOpen && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closePanel} />
        </>
      )}
      {panelOpen && (
        <div className="fixed right-0 top-0 h-full w-full sm:w-[440px] z-50 lg:static lg:inset-auto lg:z-auto lg:w-[400px] lg:flex-shrink-0 bg-white border border-gray-200 lg:rounded-xl rounded-none flex flex-col shadow-2xl lg:shadow-lg lg:max-h-[calc(100vh-120px)] lg:sticky lg:top-0 overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="font-semibold text-[13px] text-[#1A1A2E]">
              {editing ? 'Chỉnh sửa tour' : 'Thêm tour mới'}
            </div>
            <button onClick={closePanel} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={15} />
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto px-4 py-2">

            {/* ── Thông tin cơ bản ── */}
            <SectionTitle>Thông tin cơ bản</SectionTitle>

            <div className="space-y-3">
              <div>
                <Label required>Tên tour</Label>
                <input
                  value={form.name}
                  onChange={e => onField('name', e.target.value)}
                  placeholder="VD: Tour Hà Nội 3N2Đ"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#005BAA] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label required>Mã tour</Label>
                  <input
                    value={form.code}
                    onChange={e => onField('code', e.target.value.toUpperCase())}
                    placeholder="NN-TN-001"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:border-[#005BAA] outline-none"
                  />
                </div>
                <div>
                  <Label>Số ngày</Label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={form.duration_days}
                    onChange={e => onField('duration_days', e.target.value)}
                    placeholder="3"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#005BAA] outline-none"
                  />
                </div>
              </div>

              <div>
                <Label>Slug (URL)</Label>
                <input
                  value={form.slug}
                  onChange={e => { setSlugManual(true); onField('slug', e.target.value) }}
                  placeholder="tour-ha-noi-3n2d"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-500 focus:border-[#005BAA] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Danh mục</Label>
                  <select
                    value={form.category}
                    onChange={e => onField('category', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#005BAA] outline-none bg-white"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Quốc gia</Label>
                  <select
                    value={form.country}
                    onChange={e => onField('country', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#005BAA] outline-none bg-white"
                  >
                    <option value="">— Chọn quốc gia —</option>
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label>Điểm đến</Label>
                <input
                  value={form.destination}
                  onChange={e => onField('destination', e.target.value)}
                  placeholder="VD: Hà Nội – Ninh Bình – Hạ Long"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#005BAA] outline-none"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-medium text-gray-700">Kích hoạt (hiển thị trên website)</span>
                <button
                  onClick={() => onField('is_active', !form.is_active)}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${form.is_active ? 'bg-[#005BAA]' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* ── Nội dung ── */}
            <SectionTitle>Nội dung</SectionTitle>

            <div className="space-y-3">
              <div>
                <Label>Mô tả</Label>
                <textarea
                  value={form.description}
                  onChange={e => onField('description', e.target.value)}
                  rows={3}
                  placeholder="Mô tả ngắn về tour..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#005BAA] outline-none resize-none leading-relaxed"
                />
              </div>
              <div>
                <Label>Điểm nổi bật</Label>
                <textarea
                  value={form.highlights}
                  onChange={e => onField('highlights', e.target.value)}
                  rows={3}
                  placeholder="Điểm tham quan nổi bật, trải nghiệm đặc sắc..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#005BAA] outline-none resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* ── Lịch trình ── */}
            <SectionTitle>Lịch trình ({form.itinerary.length} ngày)</SectionTitle>

            <ItineraryEditor
              days={form.itinerary}
              onChange={days => onField('itinerary', days)}
            />

            {/* ── Hình ảnh ── */}
            <SectionTitle>Hình ảnh</SectionTitle>

            <div className="space-y-4">
              {/* Thumbnail */}
              <div>
                <Label>Ảnh đại diện (Thumbnail)</Label>
                <input
                  value={form.thumbnail_url}
                  onChange={e => onField('thumbnail_url', e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#005BAA] outline-none"
                />
                {form.thumbnail_url && (
                  <div className="mt-2 relative rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin form preview, onError replaces element innerHTML */}
                    <img
                      src={form.thumbnail_url}
                      alt="thumbnail preview"
                      className="w-full h-full object-cover"
                      onError={e => {
                        const el = e.target as HTMLImageElement
                        el.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xs text-red-400 p-2">URL không hợp lệ</div>`
                      }}
                    />
                    <button
                      onClick={() => onField('thumbnail_url', '')}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>

              {/* Gallery */}
              <div>
                <Label>Thư viện ảnh ({form.gallery_urls.length} ảnh)</Label>

                {/* Upload from local */}
                <div className="mb-2">
                  <ImageUploadInput
                    onUploadSuccess={url =>
                      setForm(prev => ({ ...prev, gallery_urls: [...prev.gallery_urls, url] }))
                    }
                  />
                </div>

                {/* Add URL input */}
                <div className="flex gap-2 mb-2">
                  <input
                    value={galleryInput}
                    onChange={e => setGalleryInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGalleryUrl())}
                    placeholder="Dán URL ảnh rồi nhấn Thêm..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:border-[#005BAA] outline-none"
                  />
                  <button
                    onClick={addGalleryUrl}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#005BAA] text-white text-xs rounded-lg hover:bg-[#0078D7] transition-colors flex-shrink-0"
                  >
                    <Plus size={11} /> Thêm
                  </button>
                </div>

                {/* Gallery grid */}
                {form.gallery_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {form.gallery_urls.map((url, idx) => (
                      <div key={idx} className="relative group rounded-md overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- gallery preview, dynamic URL */}
                        <img
                          src={url}
                          alt={`gallery-${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={e => {
                            const el = e.target as HTMLImageElement
                            el.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-[9px] text-red-400 p-1 text-center">Lỗi ảnh</div><button class="absolute inset-0" />`
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                        <button
                          onClick={() => removeGalleryUrl(idx)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Xóa ảnh"
                        >
                          <X size={9} />
                        </button>
                        <div className="absolute bottom-1 left-1 text-[8px] text-white/70 bg-black/40 px-1 rounded">
                          {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {form.gallery_urls.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400">
                    <ImageIcon size={20} className="mx-auto mb-1.5 text-gray-300" />
                    Chưa có ảnh trong thư viện — dán URL vào ô trên và nhấn Thêm
                  </div>
                )}
              </div>
            </div>

            {/* ── Hashtags ── */}
            <SectionTitle>Hashtags</SectionTitle>

            <div className="space-y-2 pb-4">
              <Label>Hashtags (phân cách bằng dấu phẩy)</Label>
              <input
                value={form.hashtags}
                onChange={e => onField('hashtags', e.target.value)}
                placeholder="#dulichtrongnuoc, #hanoi, #tour3n2d"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#005BAA] outline-none"
              />

              {/* Chips preview */}
              {form.hashtags.trim() && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {form.hashtags
                    .split(',')
                    .map(h => h.trim())
                    .filter(Boolean)
                    .map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-0.5 px-2 py-1 bg-purple-50 text-purple-700 text-[10px] rounded-full font-medium">
                        <Hash size={9} />
                        {tag.startsWith('#') ? tag.slice(1) : tag}
                      </span>
                    ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                Dùng cho SEO &amp; social media. VD: #dulichtrongnuoc, #nhatban2026
              </p>
            </div>
          </div>

          {/* Panel footer */}
          <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
            {saveError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 mb-2">
                <AlertCircle size={12} />
                {saveError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-[#005BAA] text-white text-xs font-medium rounded-lg hover:bg-[#0078D7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                {saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Tạo tour')}
              </button>
              <button
                onClick={closePanel}
                className="px-4 py-2 border border-gray-200 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gallery Manager ── */}
      {galleryTour && (
        <TourGalleryManager
          tourId={galleryTour.id}
          tourName={galleryTour.name}
          initialImages={(galleryTour.images ?? []).map(img => typeof img === 'string' ? img : img.url)}
          onClose={() => setGalleryTour(null)}
          onSaved={(imgs) => {
            setTours(prev =>
              prev.map(t => t.id === galleryTour.id ? { ...t, images: imgs } : t)
            )
            showToast('Đã lưu thư viện ảnh')
          }}
        />
      )}

      {/* ── Delete confirm dialog ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[calc(100%-2rem)] sm:w-[340px] max-w-sm">
            <div className="text-[15px] font-bold text-[#1A1A2E] mb-2">Xóa tour?</div>
            <div className="text-sm text-gray-500 mb-5">
              Thao tác này sẽ xóa vĩnh viễn tour khỏi database. Không thể hoàn tác.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 size={13} className="animate-spin" />}
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
