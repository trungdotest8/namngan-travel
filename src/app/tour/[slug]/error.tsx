'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function TourError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[TourDetail error]', error)
  }, [error])

  return (
    <main className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4">
      <div className="text-center space-y-5 max-w-sm">
        <h2 className="text-xl font-bold text-[#1A1A2E]">Đã xảy ra lỗi</h2>
        <p className="text-[#666666] text-sm leading-relaxed">
          Không thể tải thông tin tour. Vui lòng thử lại hoặc quay về trang chính.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#005BAA] text-white font-semibold text-sm rounded-xl hover:bg-[#0078D7] transition-colors"
          >
            Thử lại
          </button>
          <Link
            href="/tours"
            className="inline-flex items-center justify-center px-5 py-2.5 border-2 border-[#005BAA] text-[#005BAA] font-semibold text-sm rounded-xl hover:bg-[#F0F7FF] transition-colors"
          >
            Về danh sách tour
          </Link>
        </div>
      </div>
    </main>
  )
}
