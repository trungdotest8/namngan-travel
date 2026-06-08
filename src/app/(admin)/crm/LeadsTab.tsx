'use client'

import { useState, useEffect, useCallback } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { Lead, LeadActivity } from '@/types/lead.types'

// ── Hằng số ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 8

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'new',        label: 'Mới' },
  { value: 'contacted',  label: 'Đã liên hệ' },
  { value: 'consulting', label: 'Đang tư vấn' },
  { value: 'deposited',  label: 'Đặt cọc' },
  { value: 'converted',  label: 'Thành công' },
  { value: 'lost',       label: 'Thất bại' },
]

const STATUS_BADGE: Record<string, string> = {
  new:        'bg-blue-50 text-[#005BAA]',
  contacted:  'bg-yellow-50 text-yellow-700',
  consulting: 'bg-orange-50 text-[#FF6B00]',
  deposited:  'bg-purple-50 text-purple-700',
  converted:  'bg-green-50 text-green-700',
  lost:       'bg-gray-100 text-gray-500',
  contact:    'bg-yellow-50 text-yellow-700',
  booked:     'bg-purple-50 text-purple-700',
  done:       'bg-green-50 text-green-700',
  cancel:     'bg-gray-100 text-gray-500',
}

const SOURCE_LABELS: Record<string, string> = {
  web_form: 'Web',
  chatbot:  'Chat',
  zalo:     'Zalo',
  facebook: 'FB',
  tiktok:   'TikTok',
  organic:  'Organic',
  other:    'Khác',
}

const ACTION_ICON: Record<string, string> = {
  note:          '📝',
  call:          '📞',
  email:         '✉️',
  status_change: '🔄',
  other:         '💬',
}

const TIER_BADGE: Record<string, string> = {
  hot:  'bg-orange-50 text-[#FF6B00] border border-orange-200',
  warm: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  cold: 'bg-blue-50 text-[#005BAA] border border-blue-200',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Inner component (hooks cần đặt bên ngoài class ErrorBoundary) ──────────

function LeadsTabInner() {
  // Data
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm]     = useState('')
  const [filterSource, setFilterSource] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTemp, setFilterTemp]     = useState('all')
  const [currentPage, setCurrentPage]   = useState(1)

  // Detail panel
  const [selectedLead, setSelectedLead]           = useState<Lead | null>(null)
  const [activities, setActivities]               = useState<LeadActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [newNote, setNewNote]                     = useState('')
  const [savingNote, setSavingNote]               = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/leads?limit=200')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setLeads(json.leads ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchActivities = useCallback(async (id: string) => {
    setActivitiesLoading(true)
    try {
      const res = await fetch(`/api/leads/${id}/activities`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setActivities(json.activities ?? [])
    } catch {
      setActivities([])
    } finally {
      setActivitiesLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Reset trang khi filter thay đổi
  useEffect(() => { setCurrentPage(1) }, [searchTerm, filterSource, filterStatus, filterTemp])

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead)
    fetchActivities(lead.id)
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_status: newStatus }),
      })
      if (!res.ok) return

      const label = STATUS_OPTIONS.find(o => o.value === newStatus)?.label ?? newStatus
      await fetch(`/api/leads/${id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'status_change',
          content: `Trạng thái → ${label}`,
          staff_name: 'CRM',
        }),
      })

      if (selectedLead?.id === id) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus as Lead['status'] } : prev)
        fetchActivities(id)
      }
      fetchLeads()
    } catch {
      // silent — UI không crash
    }
  }

  const handleAddNote = async () => {
    if (!selectedLead || !newNote.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'note',
          content: newNote.trim(),
          staff_name: 'Điều hành',
        }),
      })
      if (res.ok) {
        setNewNote('')
        fetchActivities(selectedLead.id)
      }
    } finally {
      setSavingNote(false)
    }
  }

  // ── Filter logic (client-side) ─────────────────────────────────────────

  const filteredLeads = leads.filter(lead => {
    const q = searchTerm.toLowerCase()
    const matchSearch =
      lead.full_name.toLowerCase().includes(q) ||
      lead.phone.includes(searchTerm)
    const matchSource = filterSource === 'all' || lead.source_channel === filterSource
    const matchStatus = filterStatus === 'all' || lead.status === filterStatus
    const score = lead.lead_score ?? 0
    const matchTemp =
      filterTemp === 'all' ||
      (filterTemp === 'hot' ? score >= 60 : score < 60)
    return matchSearch && matchSource && matchStatus && matchTemp
  })

  const totalPages     = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE))
  const safePage       = Math.min(currentPage, totalPages)
  const paginatedLeads = filteredLeads.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  )

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#005BAA] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-red-600">
        <p>Lỗi: {error}</p>
        <button
          onClick={fetchLeads}
          className="px-4 py-2 text-sm rounded-lg bg-[#005BAA] text-white hover:bg-[#0078D7]"
        >
          Thử lại
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="bg-[#F0F7FF] rounded-xl p-4 mb-5 flex flex-wrap items-center gap-3">

        <input
          type="text"
          placeholder="Tìm tên, SĐT..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[160px] h-9 px-3 text-sm rounded-lg border border-gray-200
                     bg-white focus:outline-none focus:border-[#005BAA] text-[#1A1A2E]"
        />

        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white
                     text-[#005BAA] focus:outline-none focus:border-[#005BAA] cursor-pointer"
        >
          <option value="all">Tất cả kênh</option>
          {Object.entries(SOURCE_LABELS).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white
                     text-[#005BAA] focus:outline-none focus:border-[#005BAA] cursor-pointer"
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filterTemp}
          onChange={e => setFilterTemp(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white
                     text-[#005BAA] focus:outline-none focus:border-[#005BAA] cursor-pointer"
        >
          <option value="all">Tất cả nhiệt độ</option>
          <option value="hot">🔥 Nóng (≥ 60)</option>
          <option value="cold">🧊 Lạnh (&lt; 60)</option>
        </select>

        <button
          onClick={fetchLeads}
          className="h-9 px-4 text-sm rounded-lg bg-[#005BAA] text-white
                     hover:bg-[#0078D7] transition-colors whitespace-nowrap"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* ── Two-column grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Cột trái: bảng + pagination ─────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F0F7FF] text-[#005BAA] text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Khách hàng</th>
                  <th className="px-3 py-3 text-left font-semibold hidden sm:table-cell">Kênh</th>
                  <th className="px-3 py-3 text-center font-semibold hidden md:table-cell">Điểm</th>
                  <th className="px-3 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-3 py-3 text-left font-semibold hidden lg:table-cell">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      Không tìm thấy lead nào
                    </td>
                  </tr>
                ) : paginatedLeads.map(lead => {
                  const isSelected = selectedLead?.id === lead.id
                  const score = lead.lead_score ?? 0
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className={`cursor-pointer transition-colors hover:bg-gray-50/70
                        ${isSelected ? 'bg-[#F0F7FF]' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#1A1A2E] truncate max-w-[140px]">
                          {lead.full_name}
                        </p>
                        <p className="text-gray-500 text-xs">{lead.phone}</p>
                      </td>

                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                          {SOURCE_LABELS[lead.source_channel ?? ''] ?? lead.source_channel ?? '—'}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                          ${score >= 60
                            ? 'bg-orange-50 text-[#FF6B00]'
                            : 'bg-gray-100 text-gray-500'}`}
                        >
                          {score >= 60 ? '🔥' : ''}{score}
                        </span>
                      </td>

                      {/* Stop propagation để click row không trigger handleSelectLead */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={e => handleUpdateStatus(lead.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-lg border-0 cursor-pointer
                            focus:outline-none focus:ring-1 focus:ring-[#005BAA]
                            ${STATUS_BADGE[lead.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-3 text-gray-400 text-xs hidden lg:table-cell whitespace-nowrap">
                        {fmtDate(lead.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-3 px-1 text-sm text-gray-600">
            <button
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white
                         hover:bg-[#F0F7FF] disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              ← Trước
            </button>

            <span className="text-xs text-gray-500">
              Trang{' '}
              <span className="font-semibold text-[#005BAA]">{safePage}</span>
              /{totalPages} — {filteredLeads.length} leads
            </span>

            <button
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white
                         hover:bg-[#F0F7FF] disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              Sau →
            </button>
          </div>
        </div>

        {/* ── Cột phải: chi tiết + ghi chú + timeline ──────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm min-h-[400px]">
            {!selectedLead ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm gap-2">
                <span className="text-3xl">👈</span>
                <p>Chọn khách hàng để xem chi tiết</p>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-4">

                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#1A1A2E] text-base truncate">
                        {selectedLead.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">{selectedLead.phone}</p>
                      {selectedLead.email && (
                        <p className="text-xs text-gray-400 truncate">{selectedLead.email}</p>
                      )}
                    </div>
                    {selectedLead.ai_tier && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0
                        ${TIER_BADGE[selectedLead.ai_tier] ?? ''}`}
                      >
                        {selectedLead.ai_tier === 'hot' ? '🔥' : selectedLead.ai_tier === 'warm' ? '☀️' : '🧊'}
                        {' '}{selectedLead.ai_tier.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {selectedLead.destination_interest && (
                    <p className="mt-2 text-xs text-gray-500">
                      ✈️ {selectedLead.destination_interest}
                    </p>
                  )}
                  {selectedLead.message && (
                    <p className="mt-1 text-xs text-gray-400 italic line-clamp-2">
                      &ldquo;{selectedLead.message}&rdquo;
                    </p>
                  )}
                </div>

                {/* Ghi chú nhanh */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Ghi chú nhanh
                  </p>
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Kết quả cuộc gọi, nội dung tư vấn..."
                    rows={3}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#FF6B00]/30
                               focus:outline-none focus:border-[#FF6B00] resize-none
                               placeholder:text-gray-300 text-[#1A1A2E]"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || savingNote}
                    className="mt-2 w-full py-2 text-sm font-medium rounded-lg
                               bg-[#FF6B00] text-white hover:bg-orange-600
                               disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingNote ? 'Đang lưu...' : '💾 Lưu ghi chú'}
                  </button>
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Nhật ký tương tác
                  </p>

                  {activitiesLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-[#005BAA] border-t-transparent
                                      rounded-full animate-spin" />
                    </div>
                  ) : activities.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Chưa có nhật ký</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto flex flex-col gap-2 pr-1">
                      {activities.map(act => (
                        <div key={act.id} className="flex gap-2.5 text-xs">
                          <span className="mt-0.5 shrink-0 text-base leading-none">
                            {ACTION_ICON[act.action_type] ?? '💬'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#1A1A2E] break-words">{act.content}</p>
                            <p className="text-gray-400 mt-0.5">
                              {act.staff_name} · {fmtDate(act.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Public export ────────────────────────────────────────────────────────────

export function LeadsTab() {
  return (
    <ErrorBoundary moduleName="LeadsTab">
      <LeadsTabInner />
    </ErrorBoundary>
  )
}
