'use client'

import { useState, useRef } from 'react'
import {
  X, Upload, AlertCircle, Loader2, GripVertical,
  AlertTriangle, Image as ImageIcon,
} from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const MAX_IMAGES = 12
const WARN_SIZE_BYTES = 500 * 1024

interface Props {
  tourId:        string
  tourName:      string
  initialImages: string[]
  onClose:       () => void
  onSaved:       (images: string[]) => void
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function TourGalleryManagerInner({ tourId, tourName, initialImages, onClose, onSaved }: Props) {
  const [images, setImages]       = useState<string[]>(initialImages)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [warn, setWarn]           = useState<string | null>(null)
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const dragItem                  = useRef<number | null>(null)
  const [dragging, setDragging]   = useState<number | null>(null)
  const [dragOver, setDragOver]   = useState<number | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) { setError(`Đã đủ ${MAX_IMAGES} ảnh tối đa`); return }

    const toUpload = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, remaining)

    if (toUpload.length === 0) { setError('Chọn file ảnh (jpg, png, webp...)'); return }
    if (Array.from(files).some(f => f.size > WARN_SIZE_BYTES)) {
      setWarn(`Ảnh > 500KB — nên nén trước để tải trang nhanh hơn`)
    } else {
      setWarn(null)
    }
    setError(null)
    setUploading(true)

    const results: string[] = []
    for (const file of toUpload) {
      try {
        const b64 = await toBase64(file)
        const res = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: b64, fileName: file.name, fileType: file.type }),
        })
        const json: { url?: string; error?: string } = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Upload thất bại')
        results.push(json.url!)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi upload ảnh')
        break
      }
    }

    setImages(prev => [...prev, ...results])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  function onDragStart(idx: number) {
    dragItem.current = idx
    setDragging(idx)
  }

  function onDragEnter(idx: number) {
    setDragOver(idx)
  }

  function onDragEnd() {
    const from = dragItem.current
    const to   = dragOver
    if (from !== null && to !== null && from !== to) {
      setImages(prev => {
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      })
    }
    dragItem.current = null
    setDragging(null)
    setDragOver(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/tours/${tourId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      })
      const json: { error?: string } = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi lưu')
      onSaved(images)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể lưu thư viện ảnh')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="font-bold text-[#1A1A2E] text-base">Thư viện ảnh tour</div>
            <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tourName}</div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Upload zone */}
          <div
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
            onDragOver={e => e.preventDefault()}
            onClick={() => !uploading && images.length < MAX_IMAGES && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              images.length >= MAX_IMAGES
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-[#005BAA]/30 hover:border-[#005BAA]/60 cursor-pointer'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
              disabled={uploading || images.length >= MAX_IMAGES}
            />
            {uploading ? (
              <Loader2 size={24} className="mx-auto mb-2 text-[#005BAA] animate-spin" />
            ) : (
              <Upload size={24} className="mx-auto mb-2 text-[#005BAA]/50" />
            )}
            <p className="text-sm font-medium text-[#005BAA]">
              {uploading ? 'Đang tải lên...' : 'Kéo thả ảnh hoặc click để chọn'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Tối đa {MAX_IMAGES} ảnh • Ảnh đầu tiên = ảnh đại diện gallery
            </p>
            {images.length >= MAX_IMAGES && (
              <p className="text-xs text-orange-500 mt-1 font-medium">Đã đủ {MAX_IMAGES} ảnh</p>
            )}
          </div>

          {/* Warning */}
          {warn && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              {warn}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Image grid with drag-to-reorder */}
          {images.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((url, idx) => (
                <div
                  key={url + idx}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragEnter={() => onDragEnter(idx)}
                  onDragEnd={onDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className={`relative group rounded-lg overflow-hidden bg-gray-100 cursor-grab active:cursor-grabbing transition-opacity select-none ${
                    dragging === idx    ? 'opacity-40' :
                    dragOver === idx    ? 'ring-2 ring-[#005BAA] ring-offset-1' : ''
                  }`}
                  style={{ aspectRatio: '4/3' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`ảnh ${idx + 1}`}
                    className="w-full h-full object-cover pointer-events-none"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
                  {/* Drag handle */}
                  <div className="absolute top-1.5 left-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={13} />
                  </div>
                  {/* Index badge */}
                  <div className="absolute bottom-1.5 left-1.5 text-[9px] text-white bg-black/60 px-1.5 py-0.5 rounded font-bold">
                    {idx === 0 ? 'Đại diện' : idx + 1}
                  </div>
                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); removeImage(idx) }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <ImageIcon size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Chưa có ảnh — upload bên trên để thêm</p>
            </div>
          )}

          <p className="text-[10.5px] text-gray-400">
            Kéo thả để sắp xếp lại thứ tự. Ảnh đầu tiên sẽ hiển thị làm ảnh đại diện gallery trên trang tour.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3 flex-shrink-0 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">{images.length}/{MAX_IMAGES} ảnh</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#005BAA] text-white text-xs font-medium rounded-lg hover:bg-[#0078D7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 size={11} className="animate-spin" />}
              {saving ? 'Đang lưu...' : 'Lưu thư viện'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TourGalleryManager(props: Props) {
  return (
    <ErrorBoundary moduleName="GalleryManager">
      <TourGalleryManagerInner {...props} />
    </ErrorBoundary>
  )
}
