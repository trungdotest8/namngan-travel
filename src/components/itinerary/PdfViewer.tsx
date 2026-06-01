'use client'

import { useState } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { ItineraryResponse } from '@/types/pdf-index.types'

interface PdfViewerProps {
  pdf: ItineraryResponse['pdf']
  title?: string
}

function PdfViewerInner({ pdf, title }: PdfViewerProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (!pdf) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-400">
        Chưa có file lịch trình PDF.
      </div>
    )
  }

  // Ưu tiên /preview URL (drive_id) vì embed tốt hơn webViewLink
  const embedSrc = pdf.drive_id
    ? `https://drive.google.com/file/d/${pdf.drive_id}/preview`
    : pdf.drive_link

  if (!embedSrc) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        <p className="font-medium">Không thể tải lịch trình PDF.</p>
        <p className="mt-1 text-red-400">Link Google Drive không hợp lệ.</p>
      </div>
    )
  }

  if (errored) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        <p className="font-medium">Không thể hiển thị lịch trình PDF.</p>
        <p className="mt-1 text-red-400">
          Vui lòng{' '}
          <a
            href={pdf.drive_link ?? embedSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            mở trực tiếp trên Google Drive
          </a>
          .
        </p>
      </div>
    )
  }

  const displayTitle = title ?? pdf.title

  return (
    <div className="space-y-2">
      {displayTitle && (
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {displayTitle}
        </p>
      )}

      <div
        className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
        style={{ minHeight: '560px' }}
      >
        {/* Skeleton hiển thị khi iframe chưa load xong */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-gray-50">
            <div
              className="w-10 h-10 rounded-full border-2 border-blue-100 animate-spin"
              style={{ borderTopColor: '#005BAA' }}
            />
            <p className="text-xs text-gray-400 animate-pulse">Đang tải lịch trình PDF…</p>
          </div>
        )}

        <iframe
          src={embedSrc}
          title={displayTitle ?? 'Lịch trình tour'}
          className="w-full border-0 block"
          style={{ minHeight: '560px' }}
          allow="autoplay"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      </div>

      {pdf.summary && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{pdf.summary}</p>
      )}
    </div>
  )
}

export default function PdfViewer(props: PdfViewerProps) {
  return (
    <ErrorBoundary moduleName="PdfViewer">
      <PdfViewerInner {...props} />
    </ErrorBoundary>
  )
}
