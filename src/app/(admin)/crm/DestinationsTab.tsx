'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Loader2, AlertCircle,
  CheckCircle2, X, GripVertical, Eye, EyeOff, ExternalLink,
} from 'lucide-react'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeaturedDestination {
  id:          string
  name:        string
  image_url:   string
  href:        string
  sort_order:  number
  is_active:   boolean
  created_at:  string
}

interface DestFormState {
  name:       string
  image_url:  string
  href:       string
  sort_order: string
  is_active:  boolean
}

const EMPTY_FORM: DestFormState = {
  name:       '',
  image_url:  '',
  href:       '',
  sort_order: '0',
  is_active:  true,
}

// Gợi ý link nhanh cho các điểm đến phổ biến
const HREF_SUGGESTIONS = [
  // ── Quốc tế ──────────────────────────────────────────────────────────────
  { label: 'Tour Trung Quốc',   href: '/tours?category=international&country=Trung+Qu%E1%BB%91c' },
  { label: 'Tour Nhật Bản',    href: '/tours?category=international&country=Nh%E1%BA%ADt+B%E1%BA%A3n' },
  { label: 'Tour Hàn Quốc',    href: '/tours?category=international&country=H%C3%A0n+Qu%E1%BB%91c' },
  { label: 'Tour Thái Lan',    href: '/tours?category=international&country=Th%C3%A1i+Lan' },
  { label: 'Tour Singapore',   href: '/tours?category=international&country=Singapore' },
  { label: 'Tour Đài Loan',    href: '/tours?category=international&country=%C4%90%C3%A0i+Loan' },
  { label: 'Tour Malaysia',    href: '/tours?category=international&country=Malaysia' },
  { label: 'Tour Indonesia',   href: '/tours?category=international&country=Indonesia' },
  { label: 'Tour Campuchia',   href: '/tours?category=international&country=Campuchia' },
  { label: 'Tour Lào',         href: '/tours?category=international&country=L%C3%A0o' },
  { label: 'Tour Hồng Kông',   href: '/tours?category=international&country=H%E1%BB%93ng+K%C3%B4ng' },
  { label: 'Tour Philippines',  href: '/tours?category=international&country=Philippines' },
  { label: 'Tour Mỹ',          href: '/tours?category=international&country=M%E1%BB%B9' },
  { label: 'Tour Úc',          href: '/tours?category=international&country=Australia' },
  { label: 'Tour Châu Âu',     href: '/tours?category=international&country=Ch%C3%A2u+%C3%82u' },
  { label: 'Tour Ấn Độ',       href: '/tours?category=international&country=%E1%BA%A4n+%C4%90%E1%BB%99' },
  { label: 'Tour UAE / Dubai',  href: '/tours?category=international&country=UAE' },
  { label: 'Tour Canada',      href: '/tours?category=international&country=Canada' },
  { label: 'Tour Thổ Nhĩ Kỳ',  href: '/tours?category=international&country=Th%E1%BB%95+Nh%C4%A9+K%E1%BB%B3' },
  // ── Trong nước ───────────────────────────────────────────────────────────
  { label: 'Tour Phú Quốc',    href: '/tour-trong-nuoc?destination=Ph%C3%BA+Qu%E1%BB%91c' },
  { label: 'Tour Đà Nẵng',     href: '/tour-trong-nuoc?destination=%C4%90%C3%A0+N%E1%BA%B5ng' },
  { label: 'Tour Hà Giang',    href: '/tour-trong-nuoc?destination=H%C3%A0+Giang' },
  { label: 'Tour Sapa',        href: '/tour-trong-nuoc?destination=Sapa' },
  { label: 'Tour Hạ Long',     href: '/tour-trong-nuoc?destination=H%E1%BA%A1+Long' },
  { label: 'Tour Đà Lạt',      href: '/tour-trong-nuoc?destination=%C4%90%C3%A0+L%E1%BA%A1t' },
  { label: 'Tour Nha Trang',   href: '/tour-trong-nuoc?destination=Nha+Trang' },
  { label: 'Tour Hội An',      href: '/tour-trong-nuoc?destination=H%E1%BB%99i+An' },
  { label: 'Tour Hà Nội',      href: '/tour-trong-nuoc?destination=H%C3%A0+N%E1%BB%99i' },
  // ── Tổng hợp ─────────────────────────────────────────────────────────────
  { label: 'Tất cả tour quốc tế', href: '/tour-nuoc-ngoai' },
  { label: 'Tất cả tour trong nước', href: '/tour-trong-nuoc' },
  { label: 'Tất cả tour',      href: '/tours' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function DestinationsTab() {
  const [items, setItems]       = useState<FeaturedDestination[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal]   = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [form, setForm]             = useState<DestFormState>(EMPTY_FORM)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const flash = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000) }
    else         { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Admin cần thấy cả inactive → dùng API với cookie auth, thêm ?all=1
      const res = await fetch('/api/featured-destinations?all=1')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi tải')
      setItems(json.data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi tải điểm đến')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditId(null)
    setForm({ ...EMPTY_FORM, sort_order: String((items.length + 1) * 10) })
    setShowModal(true)
  }

  function openEdit(item: FeaturedDestination) {
    setEditId(item.id)
    setForm({
      name:       item.name,
      image_url:  item.image_url,
      href:       item.href,
      sort_order: String(item.sort_order),
      is_active:  item.is_active,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.image_url.trim() || !form.href.trim()) {
      flash('Vui lòng điền đầy đủ: Tên, Ảnh, Link', true)
      return
    }
    setSaving(true)
    try {
      const payload = {
        name:       form.name.trim(),
        image_url:  form.image_url.trim(),
        href:       form.href.trim(),
        sort_order: parseInt(form.sort_order) || 0,
        is_active:  form.is_active,
      }
      const url = editId
        ? `/api/featured-destinations/${editId}`
        : '/api/featured-destinations'
      const res = await fetch(url, {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi lưu')
      flash(editId ? 'Đã cập nhật điểm đến' : 'Đã thêm điểm đến mới')
      setShowModal(false)
      load()
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Lỗi lưu', true)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa điểm đến "${name}"?`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/featured-destinations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Lỗi xóa')
      flash(`Đã xóa "${name}"`)
      load()
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Lỗi xóa', true)
    } finally {
      setDeleting(null)
    }
  }

  async function toggleActive(item: FeaturedDestination) {
    try {
      const res = await fetch(`/api/featured-destinations/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active }),
      })
      if (!res.ok) throw new Error('Lỗi cập nhật')
      load()
    } catch (e: unknown) {
      flash('Lỗi cập nhật trạng thái', true)
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-bold text-xl text-[#1A1A2E]">Điểm đến nổi bật</div>
          <div className="text-sm text-gray-400 mt-0.5">
            Quản lý các thẻ điểm đến hiển thị trên trang chủ — kéo thả để sắp xếp thứ tự
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#005BAA] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0078D7] transition-colors"
        >
          <Plus size={16} />
          Thêm điểm đến
        </button>
      </div>

      {/* ── Flash messages ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          {success}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Đang tải...</span>
        </div>
      )}

      {/* ── Grid ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                item.is_active ? 'border-transparent shadow-sm' : 'border-dashed border-gray-300 opacity-60'
              }`}
            >
              {/* Image */}
              <div className="relative aspect-[3/4] bg-gray-100">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="180px"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs">No image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                  <p className="font-bold text-xs leading-tight">{item.name}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">#{item.sort_order}</p>
                </div>

                {/* Inactive badge */}
                {!item.is_active && (
                  <div className="absolute top-2 left-2 bg-gray-800/80 text-white text-[9px] px-1.5 py-0.5 rounded">
                    Ẩn
                  </div>
                )}
              </div>

              {/* Actions bar */}
              <div className="bg-white border-t border-gray-100 flex items-center justify-between px-1.5 py-1">
                {/* Sort handle (visual only) */}
                <GripVertical size={14} className="text-gray-300 cursor-grab" />

                <div className="flex items-center gap-0.5">
                  {/* Toggle active */}
                  <button
                    onClick={() => toggleActive(item)}
                    title={item.is_active ? 'Ẩn' : 'Hiện'}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {item.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>

                  {/* Preview link */}
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    title="Xem link"
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#005BAA] transition-colors"
                  >
                    <ExternalLink size={13} />
                  </a>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(item)}
                    title="Sửa"
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#005BAA] transition-colors"
                  >
                    <Pencil size={13} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    title="Xóa"
                    disabled={deleting === item.id}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {deleting === item.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">
              Chưa có điểm đến nào. Bấm &ldquo;Thêm điểm đến&rdquo; để bắt đầu.
            </div>
          )}
        </div>
      )}

      {/* ── Preview info ── */}
      {!loading && items.length > 0 && (
        <p className="text-xs text-gray-400 mt-4">
          {items.filter(i => i.is_active).length} điểm đến đang hiển thị trên trang chủ.
          Thứ tự hiển thị theo &ldquo;Số thứ tự&rdquo; tăng dần.
        </p>
      )}

      {/* ── Modal Create/Edit ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="font-semibold text-[#1A1A2E]">
                {editId ? 'Sửa điểm đến' : 'Thêm điểm đến mới'}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên điểm đến <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Trung Quốc, Phú Quốc..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005BAA]/30"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL ảnh <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005BAA]/30"
                />
                {form.image_url && (
                  <div className="mt-2 relative h-24 w-24 rounded-lg overflow-hidden border border-gray-200">
                    <Image src={form.image_url} alt="preview" fill className="object-cover" unoptimized sizes="96px" />
                  </div>
                )}
              </div>

              {/* Href */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link trỏ đến <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    value={form.href}
                    onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="/tours?country=Trung+Qu%E1%BB%91c&category=..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005BAA]/30"
                  />
                  {showSuggestions && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {HREF_SUGGESTIONS.map(s => (
                        <button
                          key={s.href}
                          type="button"
                          onMouseDown={() => setForm(f => ({ ...f, href: s.href }))}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[#F0F7FF] text-gray-700 hover:text-[#005BAA] transition-colors"
                        >
                          <span className="font-medium">{s.label}</span>
                          <span className="text-gray-400 ml-2 text-[10px]">{s.href}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Bấm vào ô để xem gợi ý link nhanh theo từng nước/điểm đến
                </p>
              </div>

              {/* Sort order + Active */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số thứ tự</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005BAA]/30"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Số nhỏ hiện trước</p>
                </div>
                <div className="flex-1 flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        form.is_active ? 'bg-[#005BAA]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        form.is_active ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                    <span className="text-sm text-gray-700">
                      {form.is_active ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-[#005BAA] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#0078D7] disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editId ? 'Lưu thay đổi' : 'Thêm điểm đến'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
