'use client'

import { useState } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

type Platform = 'facebook' | 'tiktok'

interface DownloadState {
  loading: Platform | null
  error:   string | null
}

function AudienceExportButtonsInner() {
  const [state, setState] = useState<DownloadState>({ loading: null, error: null })

  async function handleExport(platform: Platform) {
    setState({ loading: platform, error: null })

    try {
      const res = await fetch(`/api/admin/audiences/export?platform=${platform}`)

      if (!res.ok) {
        let msg = `Lỗi ${res.status}`
        try {
          const json = (await res.json()) as { error?: string }
          if (json.error) msg = json.error
        } catch {
          // keep default msg
        }
        setState({ loading: null, error: msg })
        return
      }

      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const filename = `audience_${platform}_${new Date().toISOString().slice(0, 10)}.csv`

      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Khóa 5 giây chống spam
      setTimeout(() => setState({ loading: null, error: null }), 5000)
    } catch {
      setState({ loading: null, error: 'Không thể kết nối server. Thử lại sau.' })
    }
  }

  const btnBase =
    'inline-flex items-center gap-2 rounded-md border border-[#005BAA] px-4 py-2 text-sm font-medium text-[#005BAA] transition-colors hover:bg-[#005BAA] hover:text-white disabled:cursor-not-allowed disabled:opacity-50'

  const isDisabled = state.loading !== null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={btnBase}
          disabled={isDisabled}
          onClick={() => handleExport('facebook')}
          aria-label="Tải CSV Custom Audience Facebook"
        >
          {state.loading === 'facebook' ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#005BAA] border-t-transparent" />
          ) : (
            <span>⬇</span>
          )}
          CSV Facebook
        </button>

        <button
          type="button"
          className={btnBase}
          disabled={isDisabled}
          onClick={() => handleExport('tiktok')}
          aria-label="Tải CSV Custom Audience TikTok"
        >
          {state.loading === 'tiktok' ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#005BAA] border-t-transparent" />
          ) : (
            <span>⬇</span>
          )}
          CSV TikTok
        </button>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </div>
  )
}

export function AudienceExportButtons() {
  return (
    <ErrorBoundary moduleName="AudienceExport">
      <AudienceExportButtonsInner />
    </ErrorBoundary>
  )
}
