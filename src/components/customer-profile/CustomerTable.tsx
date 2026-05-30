'use client'

import { useCustomerProfileStore, selectFilteredCustomers, type CRMFilter } from '@/store/customer-profile.store'
import type { Lead, LeadStatus } from '@/types/lead.types'
import { Search, Globe, ExternalLink, Eye, FolderX } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

function computeScore(lead: Lead): number {
  const base: Record<string, number> = {
    converted: 92, deposited: 82, consulting: 62,
    contacted: 55, new: 42, lost: 22,
  }
  const b = base[lead.status] ?? 50
  const variance = lead.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 14 - 7
  return Math.max(10, Math.min(100, b + variance))
}

const STATUS_MAP: Record<LeadStatus, { label: string; cls: string }> = {
  new:        { label: 'Mới nhập',     cls: 'bg-[#F0F7FF] text-[#005BAA]' },
  contacted:  { label: 'Đang tư vấn', cls: 'bg-amber-50 text-amber-700' },
  consulting: { label: 'Đang tư vấn', cls: 'bg-amber-50 text-amber-700' },
  deposited:  { label: 'Đã đặt cọc',  cls: 'bg-green-50 text-green-700' },
  converted:  { label: 'Đã chốt',     cls: 'bg-purple-50 text-purple-700' },
  lost:       { label: 'Hủy',         cls: 'bg-red-50 text-red-700' },
}

const AVATAR_COLORS = [
  '#005BAA', '#c2410c', '#0369a1',
  '#065f46', '#6b21a8', '#b45309', '#be123c',
]

const FILTER_OPTIONS: { value: CRMFilter; label: string }[] = [
  { value: 'all',      label: 'Tất cả' },
  { value: 'fb_ads',   label: 'Facebook Ads' },
  { value: 'web_ads',  label: 'Web / UTM' },
  { value: 'deposited',label: 'Đã đặt cọc' },
  { value: 'new',      label: 'Mới nhập' },
]

// ── Component ──────────────────────────────────────────────────────────────
export function CustomerTable() {
  const filter       = useCustomerProfileStore((s) => s.filter)
  const search       = useCustomerProfileStore((s) => s.search)
  const setFilter    = useCustomerProfileStore((s) => s.setFilter)
  const setSearch    = useCustomerProfileStore((s) => s.setSearch)
  const openDrawer   = useCustomerProfileStore((s) => s.openDrawer)
  const filtered     = useCustomerProfileStore(selectFilteredCustomers)

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 mb-3">
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm theo tên, SĐT, email..."
          className="flex-1 bg-transparent py-2 text-sm outline-none text-[#1A1A2E] placeholder:text-gray-400"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-3">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === opt.value
                ? 'bg-[#F0F7FF] border-[#005BAA] text-[#005BAA]'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Khách hàng', 'SĐT', 'Nguồn', 'Tour quan tâm', 'Trạng thái', 'Lead Score', 'Hồ sơ'].map((h) => (
                  <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                    Không tìm thấy khách hàng nào
                  </td>
                </tr>
              ) : (
                filtered.map((lead, idx) => (
                  <CustomerRow
                    key={lead.id}
                    lead={lead}
                    idx={idx}
                    onOpen={() => openDrawer(lead.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CustomerRow({ lead, idx, onOpen }: { lead: Lead; idx: number; onOpen: () => void }) {
  const score = computeScore(lead)
  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
  const status = STATUS_MAP[lead.status]
  const imgCount = (lead.image_attachments ?? []).length
  const hasDrive = !!lead.google_drive_url

  const sourceLabel =
    lead.lead_source === 'fb_ads'
      ? { text: 'Facebook', cls: 'bg-blue-50 text-blue-700' }
      : lead.lead_source === 'web_ads' || lead.lead_source === 'organic'
      ? { text: 'Web/UTM',  cls: 'bg-orange-50 text-orange-700' }
      : { text: lead.lead_source ?? '—', cls: 'bg-gray-50 text-gray-600' }

  const scoreColor =
    score > 80 ? '#0B7A4E' : score > 50 ? '#B45309' : '#B91C1C'

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors last:border-0">
      {/* Tên */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: avatarColor }}
          >
            {getInitials(lead.full_name)}
          </div>
          <div>
            <button
              onClick={onOpen}
              className="font-semibold text-[#005BAA] hover:underline text-left leading-tight"
            >
              {lead.full_name}
            </button>
            {lead.email && (
              <div className="text-[11px] text-gray-400">{lead.email}</div>
            )}
          </div>
        </div>
      </td>

      {/* SĐT */}
      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{lead.phone}</td>

      {/* Nguồn */}
      <td className="py-2.5 px-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${sourceLabel.cls}`}>
          {lead.lead_source === 'fb_ads' ? null : <Globe size={10} />}
          {sourceLabel.text}
        </span>
      </td>

      {/* Tour */}
      <td className="py-2.5 px-3 text-sm text-gray-700">
        {lead.utm_campaign ?? lead.message ?? '—'}
      </td>

      {/* Trạng thái */}
      <td className="py-2.5 px-3">
        {status && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium ${status.cls}`}>
            {status.label}
          </span>
        )}
      </td>

      {/* Score */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1.5">
          <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${score}%`, background: scoreColor }}
            />
          </div>
          <span className="text-xs font-semibold" style={{ color: scoreColor }}>{score}</span>
        </div>
      </td>

      {/* Hồ sơ */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">{imgCount} ảnh</span>
          {hasDrive
            ? <ExternalLink size={13} className="text-blue-500" />
            : <FolderX size={13} className="text-gray-300" />
          }
          <button
            onClick={onOpen}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 text-[11px] text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Eye size={11} /> Xem
          </button>
        </div>
      </td>
    </tr>
  )
}
