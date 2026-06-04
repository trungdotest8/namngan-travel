'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Loader2, AlertCircle,
  CheckCircle2, X, ExternalLink, Eye, EyeOff, Archive,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Article } from '@/types/news.types'

const TiptapLiteEditor = dynamic(() => import('@/components/cms/TiptapLiteEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-200 rounded-lg h-[260px] flex items-center justify-center text-gray-400 text-sm">
      <Loader2 size={16} className="animate-spin mr-2" /> Đang tải editor...
    </div>
  ),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  published: { label: 'Đã đăng',  cls: 'bg-green-50 text-green-700' },
  draft:     { label: 'Nháp',     cls: 'bg-gray-100 text-gray-600'  },
  archived:  { label: 'Lưu trữ', cls: 'bg-amber-50 text-amber-700' },
}

const CATEGORIES = [
  { value: 'du-lich', label: 'Du lịch'  },
  { value: 'am-thuc', label: 'Ẩm thực' },
  { value: 'van-hoa', label: 'Văn hóa' },
  { value: 'meo-hay', label: 'Mẹo hay' },
]

// ── Form state type ───────────────────────────────────────────────────────────

interface FormState {
  title:         string
  slug:          string
  summary:       string
  content:       string
  thumbnail_url: string
  category:      string
  status:        'draft' | 'published' | 'archived'
  tags:          string  // comma-separated
  published_at:  string  // datetime-local value
}

const EMPTY_FORM: FormState = {
  title:         '',
  slug:          '',
  summary:       '',
  content:       '',
  thumbnail_url: '',
  category:      'du-lich',
  status:        'draft',
  tags:          '',
  published_at:  '',
}

function articleToForm(a: Article): FormState {
  return {
    title:         a.title,
    slug:          a.slug,
    summary:       a.summary ?? '',
    content:       a.content ?? '',
    thumbnail_url: a.thumbnail_url ?? '',
    category:      a.category ?? 'du-lich',
    status:        a.status as 'draft' | 'published' | 'archived',
    tags:          (a.tags ?? []).join(', '),
    published_at:  a.published_at
      ? new Date(a.published_at).toISOString().slice(0, 16)
      : '',
  }
}

// ── Status filter tabs ────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'published' | 'draft' | 'archived'

const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: 'all',       label: 'Tất cả'   },
  { key: 'published', label: 'Đã đăng'  },
  { key: 'draft',     label: 'Nháp'     },
  { key: 'archived',  label: 'Lưu trữ' },
]

// ── Label ─────────────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

// ── ArticlesTab ───────────────────────────────────────────────────────────────

export function ArticlesTab() {
  const [articles, setArticles]     = useState<Article[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [filter, setFilter]         = useState<FilterStatus>('all')
  const [panelOpen, setPanelOpen]   = useState(false)
  const [editing, setEditing]       = useState<Article | null>(null)
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [toast, setToast]           = useState<string | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cms?status=all&limit=200')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setArticles(json.articles ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải bài viết')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  // ── Toast ─────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Panel open/close ──────────────────────────────────────────

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSlugManual(false)
    setSaveError(null)
    setPanelOpen(true)
  }

  function openEdit(a: Article) {
    setEditing(a)
    setForm(articleToForm(a))
    setSlugManual(true)
    setSaveError(null)
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditing(null)
    setSaveError(null)
  }

  // ── Form field change ─────────────────────────────────────────

  function onField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'title' && !slugManual) {
        next.slug = toSlug(value as string)
      }
      if (key === 'status' && value === 'published' && !next.published_at) {
        next.published_at = new Date().toISOString().slice(0, 16)
      }
      return next
    })
  }

  // ── Save ──────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const tagsArr = form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const body = {
        title:         form.title,
        slug:          form.slug || toSlug(form.title),
        summary:       form.summary || null,
        content:       form.content || null,
        thumbnail_url: form.thumbnail_url || null,
        category:      form.category || null,
        status:        form.status,
        tags:          tagsArr,
        published_at:  form.published_at
          ? new Date(form.published_at).toISOString()
          : null,
        source_type:   'manual',
      }

      let res: Response
      if (editing) {
        res = await fetch(`/api/cms/${editing.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/cms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const json = await res.json()
      if (!res.ok) {
        setSaveError(json.error ?? `HTTP ${res.status}`)
        return
      }

      await fetchArticles()
      closePanel()
      showToast(editing ? 'Đã cập nhật bài viết' : 'Đã tạo bài viết mới')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Lỗi khi lưu bài viết')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/cms/${id}`, {
        method: 'DELETE',
        headers: {},
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }
      setArticles(prev => prev.filter(a => a.id !== id))
      setDeleteId(null)
      showToast('Đã xóa bài viết')
    } catch (err) {
      showToast(`Lỗi: ${err instanceof Error ? err.message : 'Không thể xóa'}`)
    } finally {
      setDeleting(false)
    }
  }

  // ── Filtered list ─────────────────────────────────────────────

  const displayed = filter === 'all'
    ? articles
    : articles.filter(a => a.status === filter)

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="font-bold text-xl text-[#1A1A2E]">Quản lý Bài viết</div>
          <div className="text-sm text-gray-400 mt-0.5">
            Tạo, chỉnh sửa và xuất bản bài viết cho trang /tin-tuc
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#005BAA] text-white text-sm font-medium hover:bg-[#0078D7] transition-colors"
        >
          <Plus size={15} />
          Thêm bài viết
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-[#005BAA] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs font-semibold ${filter === tab.key ? 'text-[#005BAA]' : 'text-gray-400'}`}>
              {tab.key === 'all' ? articles.length : articles.filter(a => a.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={15} />
          {error}
          <button onClick={fetchArticles} className="ml-auto text-xs underline">Thử lại</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 justify-center py-16 text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Đang tải...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Chưa có bài viết nào
              {filter !== 'all' && ` ở trạng thái "${FILTER_TABS.find(t => t.key === filter)?.label}"`}.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide">Tiêu đề</th>
                  <th className="text-left px-3 py-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide w-28">Danh mục</th>
                  <th className="text-left px-3 py-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide w-28">Trạng thái</th>
                  <th className="text-left px-3 py-3 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide w-28">Ngày đăng</th>
                  <th className="w-24 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(a => {
                  const st = STATUS_MAP[a.status] ?? STATUS_MAP.draft
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1A1A2E] line-clamp-1">{a.title}</div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">/tin-tuc/{a.slug}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs">{a.category ?? '—'}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold ${st.cls}`}>
                          {a.status === 'published' && <Eye size={10} />}
                          {a.status === 'draft'     && <EyeOff size={10} />}
                          {a.status === 'archived'  && <Archive size={10} />}
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs">{fmtDate(a.published_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <a
                            href={`/tin-tuc/${a.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#005BAA] transition-colors"
                            title="Xem bài viết"
                          >
                            <ExternalLink size={13} />
                          </a>
                          <button
                            onClick={() => openEdit(a)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#005BAA] transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteId(a.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Delete confirm dialog ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <div className="font-semibold text-[#1A1A2E] text-sm">Xóa bài viết?</div>
                <div className="text-xs text-gray-400 mt-0.5">Hành động này không thể hoàn tác.</div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {deleting && <Loader2 size={13} className="animate-spin" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-over form panel ── */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />
          <div className="fixed right-0 top-0 h-full w-[520px] z-50 bg-white shadow-2xl flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="font-semibold text-[#1A1A2E]">
                {editing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
              </div>
              <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Title */}
              <div>
                <Label required>Tiêu đề</Label>
                <input
                  value={form.title}
                  onChange={e => onField('title', e.target.value)}
                  placeholder="Ví dụ: Kinh nghiệm du lịch Hạ Long..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#005BAA] focus:outline-none"
                />
              </div>

              {/* Slug */}
              <div>
                <Label>Slug (URL)</Label>
                <input
                  value={form.slug}
                  onChange={e => { setSlugManual(true); onField('slug', e.target.value) }}
                  placeholder="kinh-nghiem-du-lich-ha-long"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-[#005BAA] focus:outline-none"
                />
                <div className="text-[10.5px] text-gray-400 mt-0.5">namngantravel.com/tin-tuc/{form.slug || '...'}</div>
              </div>

              {/* Category + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Danh mục</Label>
                  <select
                    value={form.category}
                    onChange={e => onField('category', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#005BAA] focus:outline-none bg-white"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Trạng thái</Label>
                  <select
                    value={form.status}
                    onChange={e => onField('status', e.target.value as FormState['status'])}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#005BAA] focus:outline-none bg-white"
                  >
                    <option value="draft">Nháp</option>
                    <option value="published">Đăng ngay</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>
              </div>

              {/* Published at */}
              <div>
                <Label>Ngày đăng</Label>
                <input
                  type="datetime-local"
                  value={form.published_at}
                  onChange={e => onField('published_at', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#005BAA] focus:outline-none"
                />
              </div>

              {/* Thumbnail URL */}
              <div>
                <Label>Ảnh đại diện (URL)</Label>
                <input
                  value={form.thumbnail_url}
                  onChange={e => onField('thumbnail_url', e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#005BAA] focus:outline-none"
                />
                {form.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.thumbnail_url}
                    alt=""
                    className="mt-2 h-20 w-full object-cover rounded-lg border border-gray-100"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>

              {/* Tags */}
              <div>
                <Label>Tags (phân cách bằng dấu phẩy)</Label>
                <input
                  value={form.tags}
                  onChange={e => onField('tags', e.target.value)}
                  placeholder="ha-long, bien-dao, mien-bac"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#005BAA] focus:outline-none"
                />
              </div>

              {/* Summary */}
              <div>
                <Label>Tóm tắt</Label>
                <textarea
                  value={form.summary}
                  onChange={e => onField('summary', e.target.value)}
                  rows={3}
                  placeholder="Mô tả ngắn hiển thị dưới tiêu đề bài viết..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#005BAA] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Content */}
              <div>
                <Label>Nội dung</Label>
                <TiptapLiteEditor
                  content={form.content}
                  onChange={html => onField('content', html)}
                />
              </div>

              {/* Error */}
              {saveError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
              <button
                onClick={closePanel}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-[#005BAA] rounded-lg hover:bg-[#0078D7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <><Loader2 size={13} className="animate-spin" /> Đang lưu...</>
                ) : (
                  <><CheckCircle2 size={13} /> {editing ? 'Cập nhật' : 'Tạo bài viết'}</>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#1A1A2E] text-white text-sm font-medium rounded-xl shadow-lg animate-in slide-in-from-bottom-4">
          <CheckCircle2 size={15} className="text-green-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
