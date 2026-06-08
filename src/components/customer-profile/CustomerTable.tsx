'use client'

import { useState, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import { useCustomerProfileStore, selectFilteredCustomers, type CRMFilter } from '@/store/customer-profile.store'
import type { Lead, LeadStatus } from '@/types/lead.types'
import { Search, Globe, ExternalLink, Eye, FolderX, Flame, ThermometerSun, Snowflake, Download, Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { LeadTier } from '@/types/lead.types'

// ── Helpers ────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

const TIER_CONFIG: Record<LeadTier, { label: string; cls: string; Icon: React.ElementType }> = {
  hot:  { label: 'HOT',  cls: 'bg-red-50 text-red-600 border border-red-200',      Icon: Flame },
  warm: { label: 'WARM', cls: 'bg-amber-50 text-amber-600 border border-amber-200', Icon: ThermometerSun },
  cold: { label: 'COLD', cls: 'bg-sky-50 text-sky-600 border border-sky-200',       Icon: Snowflake },
}

const STATUS_MAP: Record<LeadStatus, { label: string; cls: string }> = {
  new:        { label: 'Mới nhập',     cls: 'bg-[#F0F7FF] text-[#005BAA]' },
  contacted:  { label: 'Đang tư vấn', cls: 'bg-amber-50 text-amber-700' },
  contact:    { label: 'Đang liên hệ', cls: 'bg-amber-50 text-amber-600' },
  consulting: { label: 'Tư vấn',      cls: 'bg-amber-50 text-amber-700' },
  deposited:  { label: 'Đã đặt cọc',  cls: 'bg-green-50 text-green-700' },
  booked:     { label: 'Đã đặt chỗ', cls: 'bg-green-50 text-green-600' },
  converted:  { label: 'Đã chốt',     cls: 'bg-purple-50 text-purple-700' },
  done:       { label: 'Hoàn thành',  cls: 'bg-purple-50 text-purple-600' },
  lost:       { label: 'Hủy',         cls: 'bg-red-50 text-red-700' },
  cancel:     { label: 'Đã hủy',      cls: 'bg-red-50 text-red-600' },
}

const AVATAR_COLORS = [
  '#005BAA', '#c2410c', '#0369a1',
  '#065f46', '#6b21a8', '#b45309', '#be123c',
]

const FILTER_OPTIONS: { value: CRMFilter; label: string; Icon?: React.ElementType; iconCls?: string }[] = [
  { value: 'all',       label: 'Tất cả' },
  { value: 'hot',       label: 'HOT',  Icon: Flame,          iconCls: 'text-red-500' },
  { value: 'warm',      label: 'WARM', Icon: ThermometerSun, iconCls: 'text-amber-500' },
  { value: 'cold',      label: 'COLD', Icon: Snowflake,      iconCls: 'text-sky-500' },
  { value: 'fb_ads',    label: 'Facebook Ads' },
  { value: 'web_ads',   label: 'Web / UTM' },
  { value: 'deposited', label: 'Đã chốt' },
  { value: 'new',       label: 'Mới nhập' },
]

// ── Export helpers ─────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('84') && d.length >= 11) return `+${d}`
  if (d.startsWith('0') && d.length >= 9)   return `+84${d.slice(1)}`
  return d ? `+${d}` : ''
}

function toCSV(rows: string[][]): string {
  return rows
    .map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

function buildFacebookCSV(leads: Lead[]): string {
  const header = ['email', 'phone', 'fn', 'ln', 'country']
  const data = leads.map(l => {
    const parts = l.full_name.trim().split(' ')
    return [
      (l.email ?? '').toLowerCase(),
      l.phone ? normalizePhone(l.phone) : '',
      parts[0] ?? '',
      parts.slice(1).join(' ') || (parts[0] ?? ''),
      'VN',
    ]
  })
  return toCSV([header, ...data])
}

function buildTikTokCSV(leads: Lead[]): string {
  const header = ['Email', 'Phone Number']
  const data = leads.map(l => [
    (l.email ?? '').toLowerCase(),
    l.phone ? normalizePhone(l.phone) : '',
  ])
  return toCSV([header, ...data])
}

function buildFullCSV(leads: Lead[]): string {
  const header = ['Họ tên', 'Điện thoại', 'Email', 'Nguồn', 'Kênh', 'Trạng thái', 'Điểm', 'Điểm đến', 'Ngày tạo']
  const data = leads.map(l => [
    l.full_name,
    l.phone,
    l.email ?? '',
    l.lead_source ?? '',
    l.source_channel ?? '',
    l.status,
    String(l.lead_score ?? 0),
    l.destination_interest ?? '',
    new Date(l.created_at).toLocaleDateString('vi-VN'),
  ])
  return toCSV([header, ...data])
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Import helpers ─────────────────────────────────────────────────────────

type ImportRow = { full_name: string; phone: string; email?: string; note?: string; destination_interest?: string }

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

const COLUMN_MAP: Record<string, keyof ImportRow> = {
  full_name: 'full_name', ho_ten: 'full_name', ten: 'full_name',
  name: 'full_name', ho_va_ten: 'full_name', kh: 'full_name',
  phone: 'phone', sdt: 'phone', so_dien_thoai: 'phone',
  dien_thoai: 'phone', phone_number: 'phone', so_dt: 'phone',
  email: 'email', e_mail: 'email',
  note: 'note', ghi_chu: 'note', ghi_chú: 'note',
  destination_interest: 'destination_interest', diem_den: 'destination_interest',
}

function parseCSVRows(raw: Record<string, string>[]): { rows: ImportRow[]; skipped: number } {
  const rows: ImportRow[] = []
  let skipped = 0
  raw.forEach((r) => {
    const mapped: Partial<ImportRow> = {}
    Object.entries(r).forEach(([k, v]) => {
      const field = COLUMN_MAP[normalizeHeader(k)]
      if (field) mapped[field] = v?.trim() ?? ''
    })
    // first_name + last_name → full_name
    if (!mapped.full_name) {
      const rawKeys = Object.keys(r)
      const fn = rawKeys.find((k) => normalizeHeader(k) === 'first_name')
      const ln = rawKeys.find((k) => normalizeHeader(k) === 'last_name')
      if (fn || ln) mapped.full_name = [r[fn ?? ''], r[ln ?? '']].filter(Boolean).join(' ')
    }
    if (mapped.full_name && mapped.phone) {
      rows.push(mapped as ImportRow)
    } else {
      skipped++
    }
  })
  return { rows, skipped }
}

// ── Component ──────────────────────────────────────────────────────────────
export function CustomerTable({ onRefresh }: { onRefresh?: () => void }) {
  const filter       = useCustomerProfileStore((s) => s.filter)
  const search       = useCustomerProfileStore((s) => s.search)
  const setFilter    = useCustomerProfileStore((s) => s.setFilter)
  const setSearch    = useCustomerProfileStore((s) => s.setSearch)
  const openDrawer   = useCustomerProfileStore((s) => s.openDrawer)
  const filtered     = useCustomerProfileStore(selectFilteredCustomers)

  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const [importRows, setImportRows]     = useState<ImportRow[] | null>(null)
  const [importSkipped, setImportSkipped] = useState(0)
  const [importFileName, setImportFileName] = useState('')
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number } | null>(null)
  const [importError, setImportError]   = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportResult(null)
    setImportError(null)
    setImportFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const { rows, skipped } = parseCSVRows(result.data)
        setImportRows(rows)
        setImportSkipped(skipped)
      },
      error: () => setImportError('Không thể đọc file CSV. Vui lòng kiểm tra định dạng.'),
    })
    e.target.value = ''
  }

  async function handleImport() {
    if (!importRows?.length) return
    setImporting(true)
    setImportError(null)
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: importRows }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setImportResult({ inserted: json.inserted })
      setImportRows(null)
      onRefresh?.()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setImporting(false)
    }
  }

  const stamp = new Date().toISOString().slice(0, 10)

  const EXPORT_OPTIONS = [
    {
      label: '📘 Facebook Ads',
      desc:  'email, phone (+84), fn, ln, country',
      action: () => {
        downloadCSV(buildFacebookCSV(filtered), `facebook-audience-${stamp}.csv`)
        setExportOpen(false)
      },
    },
    {
      label: '🎵 TikTok Ads',
      desc:  'Email, Phone Number',
      action: () => {
        downloadCSV(buildTikTokCSV(filtered), `tiktok-audience-${stamp}.csv`)
        setExportOpen(false)
      },
    },
    {
      label: '📊 Excel (đầy đủ)',
      desc:  'Tất cả trường, UTF-8 BOM',
      action: () => {
        downloadCSV(buildFullCSV(filtered), `customers-${stamp}.csv`)
        setExportOpen(false)
      },
    },
  ]

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Search + Import + Export */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên, SĐT, email..."
            className="flex-1 bg-transparent py-2 text-sm outline-none text-[#1A1A2E] placeholder:text-gray-400"
          />
        </div>

        {/* Import CSV button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Nhập khách từ file CSV"
          className="flex items-center gap-1.5 h-9 px-3 text-sm rounded-lg border border-gray-200
                     bg-white text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          <Upload size={14} />
          <span className="hidden sm:inline">Nhập CSV</span>
        </button>

        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen(o => !o)}
            title={`Export ${filtered.length} khách`}
            className="flex items-center gap-1.5 h-9 px-3 text-sm rounded-lg border border-gray-200
                       bg-white text-[#005BAA] hover:bg-[#F0F7FF] transition-colors whitespace-nowrap"
          >
            <Download size={14} />
            Export
            <span className="ml-0.5 text-xs font-semibold text-[#FF6B00]">{filtered.length}</span>
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-10 z-50 w-56 bg-white rounded-xl border border-gray-100
                            shadow-lg overflow-hidden">
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Chọn định dạng
              </p>
              {EXPORT_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={opt.action}
                  className="w-full text-left px-3 py-2.5 hover:bg-[#F0F7FF] transition-colors"
                >
                  <p className="text-sm font-medium text-[#1A1A2E]">{opt.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import preview panel */}
      {importRows && (
        <div className="mb-3 border border-[#005BAA]/20 bg-[#F0F7FF] rounded-xl p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-semibold text-[#1A1A2E]">
                📁 {importFileName} — <span className="text-[#005BAA]">{importRows.length} hàng</span> sẽ được nhập
                {importSkipped > 0 && (
                  <span className="text-amber-600 ml-1">({importSkipped} hàng thiếu tên/SĐT bị bỏ qua)</span>
                )}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Xem trước: {importRows.slice(0, 3).map((r) => `${r.full_name} · ${r.phone}`).join(' | ')}
                {importRows.length > 3 && ' ...'}
              </p>
            </div>
            <button onClick={() => setImportRows(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X size={14} />
            </button>
          </div>
          {importError && (
            <p className="text-xs text-red-600 mb-2 flex items-center gap-1">
              <AlertCircle size={12} /> {importError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005BAA] text-white text-xs font-medium rounded-lg hover:bg-[#0078D7] disabled:opacity-50 transition-colors"
            >
              {importing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {importing ? 'Đang nhập...' : `Xác nhận nhập ${importRows.length} khách`}
            </button>
            <button
              onClick={() => setImportRows(null)}
              className="px-3 py-1.5 border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-white transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Import result toast */}
      {importResult && (
        <div className="mb-3 flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <CheckCircle2 size={14} className="flex-shrink-0" />
          Đã nhập thành công <strong>{importResult.inserted}</strong> khách hàng.
          <button onClick={() => setImportResult(null)} className="ml-auto text-green-500 hover:text-green-700">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Import error (global) */}
      {importError && !importRows && (
        <div className="mb-3 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={14} className="flex-shrink-0" />
          {importError}
          <button onClick={() => setImportError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-3">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === opt.value
                ? 'bg-[#F0F7FF] border-[#005BAA] text-[#005BAA]'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.Icon && <opt.Icon size={11} className={filter === opt.value ? undefined : opt.iconCls} />}
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
  const score = lead.lead_score ?? 0
  const tier  = lead.ai_tier ? TIER_CONFIG[lead.ai_tier] : null
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
    score >= 60 ? '#0B7A4E' : score >= 30 ? '#B45309' : '#B91C1C'

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
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpen}
                className="font-semibold text-[#005BAA] hover:underline text-left leading-tight"
              >
                {lead.full_name}
              </button>
              {tier && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${tier.cls}`}>
                  <tier.Icon size={9} />
                  {tier.label}
                </span>
              )}
            </div>
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
