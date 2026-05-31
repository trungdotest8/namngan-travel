'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import {
  X, CloudUpload, Trash2, ExternalLink, Save, Mail,
  Phone, AlertCircle, CheckCircle2, Loader2, FolderOpen,
} from 'lucide-react'
import { useCustomerProfileStore, selectSelectedCustomer } from '@/store/customer-profile.store'
import { CustomerProfileSchema } from '@/lib/validations/customer-profile.schema'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus } from '@/types/lead.types'

// ── Status display — 6 giá trị gốc + 4 giá trị CRM (migration 20250530000003) ──
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

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

// ── Main component ─────────────────────────────────────────────────────────
export function CustomerProfileDrawer() {
  const isOpen         = useCustomerProfileStore((s) => s.isDrawerOpen)
  const customer       = useCustomerProfileStore(selectSelectedCustomer)
  const uploadStatus   = useCustomerProfileStore((s) => s.uploadStatus)
  const uploadError    = useCustomerProfileStore((s) => s.uploadError)
  const closeDrawer    = useCustomerProfileStore((s) => s.closeDrawer)
  const updateCustomer = useCustomerProfileStore((s) => s.updateCustomer)
  const setUploadStatus = useCustomerProfileStore((s) => s.setUploadStatus)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [driveUrl, setDriveUrl]     = useState('')
  const [driveError, setDriveError] = useState<string | null>(null)
  const [driveSaving, setDriveSaving] = useState(false)
  const [driveSaved, setDriveSaved]   = useState(false)

  // Reset driveUrl khi mở customer khác — chạy trong useEffect, không trong render body
  useEffect(() => {
    if (!driveSaving) {
      setDriveUrl(customer?.google_drive_url ?? '')
      setDriveError(null)
      setDriveSaved(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id])

  // ── Upload handler ───────────────────────────────────────────────────────
  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!customer) return
      const allowed = files.filter(
        (f) => f.type.startsWith('image/') || f.type === 'application/pdf',
      )
      if (allowed.length === 0) {
        setUploadStatus('error', 'Chỉ chấp nhận JPG, PNG, WebP hoặc PDF')
        return
      }

      setUploadStatus('uploading')
      const supabase = createClient()
      const uploaded: string[] = []

      for (const file of allowed) {
        const ext  = file.name.split('.').pop() ?? 'jpg'
        const path = `leads/${customer.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data, error } = await supabase.storage
          .from('customer-profiles')
          .upload(path, file, { upsert: false })

        if (error) {
          setUploadStatus('error', `Tải lên thất bại: ${error.message}`)
          return
        }
        const { data: pub } = supabase.storage
          .from('customer-profiles')
          .getPublicUrl(data.path)
        uploaded.push(pub.publicUrl)
      }

      const newAttachments = [...(customer.image_attachments ?? []), ...uploaded]

      // Lưu vào Supabase qua API (Principle #5: validate trước khi ghi)
      const res = await fetch('/api/customer-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '',
        },
        body: JSON.stringify({ lead_id: customer.id, image_attachments: newAttachments }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Lỗi không xác định' }))
        setUploadStatus('error', error ?? 'Không thể lưu danh sách ảnh')
        return
      }
      updateCustomer(customer.id, { image_attachments: newAttachments })
      setUploadStatus('success')
      setTimeout(() => setUploadStatus('idle'), 2500)
    },
    [customer, updateCustomer, setUploadStatus],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      uploadFiles(Array.from(e.dataTransfer.files))
    },
    [uploadFiles],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) uploadFiles(Array.from(e.target.files))
      e.target.value = ''
    },
    [uploadFiles],
  )

  // ── Remove image ─────────────────────────────────────────────────────────
  const removeImage = useCallback(
    async (idx: number) => {
      if (!customer) return
      const next = (customer.image_attachments ?? []).filter((_, i) => i !== idx)
      updateCustomer(customer.id, { image_attachments: next })
      const removeRes = await fetch('/api/customer-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '',
        },
        body: JSON.stringify({ lead_id: customer.id, image_attachments: next }),
      })
      if (!removeRes.ok) {
        updateCustomer(customer.id, { image_attachments: customer.image_attachments })
      }
    },
    [customer, updateCustomer],
  )

  // ── Save Drive URL ───────────────────────────────────────────────────────
  const saveDriveUrl = useCallback(async () => {
    if (!customer) return
    const result = CustomerProfileSchema.pick({ google_drive_url: true }).safeParse({
      google_drive_url: driveUrl || undefined,
    })
    if (!result.success) {
      setDriveError(result.error.flatten().fieldErrors.google_drive_url?.[0] ?? 'URL không hợp lệ')
      return
    }
    setDriveError(null)
    setDriveSaving(true)
    const res = await fetch('/api/customer-profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '',
      },
      body: JSON.stringify({ lead_id: customer.id, google_drive_url: driveUrl }),
    })
    setDriveSaving(false)
    if (!res.ok) {
      setDriveError('Không thể lưu. Thử lại sau.')
      return
    }
    updateCustomer(customer.id, { google_drive_url: driveUrl || null })
    setDriveSaved(true)
    setTimeout(() => setDriveSaved(false), 2500)
  }, [customer, driveUrl, updateCustomer])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 h-screen w-[520px] max-w-[95vw] bg-white z-50 flex flex-col shadow-2xl border-l border-gray-100"
        role="dialog"
        aria-modal="true"
        aria-label="Hồ sơ khách hàng"
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0 sticky top-0 bg-white z-10">
          {customer ? (
            <>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: '#005BAA' }}
              >
                {getInitials(customer.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#1A1A2E] truncate">{customer.full_name}</div>
                <div className="text-[11.5px] text-gray-400 truncate">
                  {customer.phone}
                  {customer.email ? ` · ${customer.email}` : ''}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 text-gray-400 text-sm">Đang tải…</div>
          )}
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        {customer ? (
          <DrawerBody
            customer={customer}
            isDragOver={isDragOver}
            setIsDragOver={setIsDragOver}
            uploadStatus={uploadStatus}
            uploadError={uploadError}
            fileInputRef={fileInputRef}
            handleDrop={handleDrop}
            handleFileInput={handleFileInput}
            removeImage={removeImage}
            driveUrl={driveUrl}
            setDriveUrl={setDriveUrl}
            driveError={driveError}
            setDriveError={setDriveError}
            driveSaving={driveSaving}
            driveSaved={driveSaved}
            saveDriveUrl={saveDriveUrl}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Không tìm thấy khách hàng
          </div>
        )}
      </aside>
    </>
  )
}

// ── DrawerBody ─────────────────────────────────────────────────────────────
interface DrawerBodyProps {
  customer: Lead
  isDragOver: boolean
  setIsDragOver: (v: boolean) => void
  uploadStatus: string
  uploadError: string | null
  fileInputRef: React.RefObject<HTMLInputElement>
  handleDrop: (e: React.DragEvent) => void
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  removeImage: (idx: number) => void
  driveUrl: string
  setDriveUrl: (v: string) => void
  driveError: string | null
  setDriveError: (v: string | null) => void
  driveSaving: boolean
  driveSaved: boolean
  saveDriveUrl: () => void
}

function DrawerBody({
  customer, isDragOver, setIsDragOver,
  uploadStatus, uploadError,
  fileInputRef, handleDrop, handleFileInput, removeImage,
  driveUrl, setDriveUrl, driveError, setDriveError, driveSaving, driveSaved, saveDriveUrl,
}: DrawerBodyProps) {
  const status = STATUS_MAP[customer.status]
  const images = customer.image_attachments ?? []

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

      {/* ── Thông tin cơ bản ── */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: 'Nguồn Lead',    value: customer.lead_source ?? '—' },
          { label: 'Trạng thái',    value: status
            ? <span className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-medium ${status.cls}`}>{status.label}</span>
            : '—' },
          { label: 'Ghi chú tư vấn', value: customer.note ?? '—', full: true },
          ...(customer.utm_source
            ? [{ label: 'UTM Params', value:
                `${customer.utm_source}/${customer.utm_medium ?? ''}/${customer.utm_campaign ?? ''}`,
                full: true, mono: true }]
            : []
          ),
        ].map((row, i) => (
          <div
            key={i}
            className={`bg-gray-50 rounded-lg px-3 py-2.5 ${row.full ? 'col-span-2' : ''}`}
          >
            <div className="text-[10.5px] text-gray-400 font-semibold uppercase tracking-wide mb-1">
              {row.label}
            </div>
            <div className={`text-sm font-medium text-[#1A1A2E] ${row.mono ? 'font-mono text-xs break-all' : ''}`}>
              {row.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Upload hình ảnh hồ sơ ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12.5px] font-semibold text-[#1A1A2E]">
            Hình ảnh hồ sơ đính kèm
          </span>
          <span className="text-[11px] text-gray-400">{images.length} tài liệu</span>
        </div>

        {/* Upload zone */}
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-[#005BAA] bg-[#F0F7FF]'
              : 'border-gray-200 bg-gray-50 hover:border-[#005BAA] hover:bg-[#F0F7FF]'
          }`}
        >
          <CloudUpload size={28} className="mx-auto mb-1.5 text-gray-400" />
          <div className="text-[12.5px] font-medium text-gray-500">
            Kéo thả hoặc click để tải lên
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Hộ chiếu, CCCD, Visa, Ảnh cá nhân · JPG, PNG, WebP, PDF
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {/* Upload status feedback (Principle #8) */}
        {uploadStatus === 'uploading' && (
          <div className="flex items-center gap-2 mt-2 text-[12px] text-[#005BAA]">
            <Loader2 size={13} className="animate-spin" />
            Đang tải lên…
          </div>
        )}
        {uploadStatus === 'success' && (
          <div className="flex items-center gap-2 mt-2 text-[12px] text-green-600">
            <CheckCircle2 size={13} /> Tải lên thành công
          </div>
        )}
        {uploadStatus === 'error' && uploadError && (
          <div className="flex items-start gap-2 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-700">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Thumbnail grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-2.5">
            {images.map((url, idx) => (
              <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Tài liệu ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] font-semibold py-0.5 text-center uppercase tracking-wide">
                  #{idx + 1}
                </div>
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Xóa tài liệu ${idx + 1}`}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Google Drive ── */}
      <div>
        <div className="text-[12.5px] font-semibold text-[#1A1A2E] mb-2 flex items-center gap-1.5">
          <FolderOpen size={14} className="text-blue-500" />
          Thư mục Google Drive
        </div>
        <div className={`flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 transition-colors ${
          driveError ? 'border-red-300' : 'border-gray-200 focus-within:border-[#005BAA]'
        }`}>
          <input
            type="url"
            value={driveUrl}
            onChange={(e) => { setDriveUrl(e.target.value); setDriveError(null) }}
            placeholder="Dán link thư mục Google Drive tại đây..."
            className="flex-1 bg-transparent text-sm text-[#005BAA] placeholder:text-gray-400 outline-none min-w-0"
          />
          <button
            onClick={saveDriveUrl}
            disabled={driveSaving}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {driveSaving
              ? <Loader2 size={11} className="animate-spin" />
              : driveSaved
              ? <CheckCircle2 size={11} className="text-green-600" />
              : <Save size={11} />
            }
            {driveSaved ? 'Đã lưu' : 'Lưu'}
          </button>
          {driveUrl && !driveError && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-[#005BAA] text-white hover:bg-[#0078D7] transition-colors flex-shrink-0"
            >
              <ExternalLink size={11} /> Mở Drive
            </a>
          )}
        </div>

        {/* Drive error / hint (Principle #8) */}
        {driveError ? (
          <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-red-600">
            <AlertCircle size={12} /> {driveError}
          </div>
        ) : !driveUrl ? (
          <div className="mt-1.5 text-[11px] text-gray-400">
            Chưa có thư mục Drive. Tạo thư mục mới và dán link vào đây.
          </div>
        ) : null}
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#005BAA] text-white text-sm font-medium hover:bg-[#0078D7] transition-colors">
          <Mail size={14} /> Gửi email xác nhận
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <Phone size={14} /> Ghi chú cuộc gọi
        </button>
      </div>

    </div>
  )
}
