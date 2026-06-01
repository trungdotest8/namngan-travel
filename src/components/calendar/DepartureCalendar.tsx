'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useCalendarStore } from '@/store'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const STATUS_LABEL: Record<string, string> = {
  open:      'Còn chỗ',
  full:      'Hết chỗ',
  cancelled: 'Huỷ',
  completed: 'Đã khởi hành',
}

const STATUS_COLOR: Record<string, string> = {
  open:      'bg-green-100 text-green-700',
  full:      'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-blue-100 text-blue-600',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatPrice(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ'
}

function DepartureCalendarInner() {
  const { schedules, isLoading, error, fetchSchedules } = useCalendarStore()

  useEffect(() => {
    fetchSchedules({ status: 'open', limit: 6 })
  }, [fetchSchedules])

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        <p className="font-medium">Không thể tải lịch khởi hành.</p>
        <button
          onClick={() => fetchSchedules({ status: 'open', limit: 6 })}
          className="mt-2 text-[#005BAA] underline"
        >
          Thử lại
        </button>
      </div>
    )
  }

  return (
    <section className="bg-[#F0F7FF] py-12">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-[#005BAA]">
              Lịch khởi hành
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#1A1A2E]">
              Tour sắp khởi hành
            </h2>
          </div>
          <Link
            href="/lich-khoi-hanh"
            className="hidden text-sm font-medium text-[#005BAA] hover:underline sm:block"
          >
            Xem tất cả →
          </Link>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white p-5 shadow-sm">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="mt-3 h-3 w-1/2 rounded bg-gray-100" />
                <div className="mt-2 h-3 w-2/3 rounded bg-gray-100" />
                <div className="mt-4 h-8 w-full rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <p className="py-10 text-center text-gray-500">
            Hiện chưa có lịch khởi hành nào.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schedules.map((s) => {
              const seatsLeft = (s.seats_total ?? 0) - (s.seats_booked ?? 0)
              return (
                <div
                  key={s.id}
                  className="group flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Tour name */}
                  <p className="line-clamp-2 font-semibold text-[#1A1A2E] group-hover:text-[#005BAA]">
                    {s.tour?.name ?? 'Tour chưa cập nhật'}
                  </p>

                  {/* Dates */}
                  <div className="mt-3 flex items-center gap-1 text-sm text-gray-500">
                    <svg className="h-4 w-4 shrink-0 text-[#005BAA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formatDate(s.departure_date)}</span>
                    <span className="text-gray-300">→</span>
                    <span>{formatDate(s.return_date)}</span>
                  </div>

                  {/* Transport */}
                  {s.transport && (
                    <p className="mt-1 text-xs text-gray-400">{s.transport}</p>
                  )}

                  {/* Price + status */}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div>
                      <span className="text-lg font-bold text-[#FF6B00]">
                        {formatPrice(s.price_adult)}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">/người</span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>

                  {/* Seats indicator */}
                  {s.status === 'open' && s.seats_total > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Chỗ còn lại</span>
                        <span className="font-medium text-gray-600">{seatsLeft}/{s.seats_total}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-[#005BAA] transition-all"
                          style={{ width: `${Math.min(100, (s.seats_booked / s.seats_total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/lich-khoi-hanh"
            className="text-sm font-medium text-[#005BAA] hover:underline"
          >
            Xem tất cả lịch khởi hành →
          </Link>
        </div>
      </div>
    </section>
  )
}

export function DepartureCalendar() {
  return (
    <ErrorBoundary moduleName="DepartureCalendar">
      <DepartureCalendarInner />
    </ErrorBoundary>
  )
}
