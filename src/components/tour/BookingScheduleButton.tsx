'use client'

import { useState } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import BookingModal from '@/components/booking/BookingModal'
import type { TourSchedule } from '@/types/tour.types'

interface Props {
  schedule: TourSchedule
  tourId:   string
  tourName: string
  disabled?: boolean
}

function InnerButton({ schedule, tourId, tourName, disabled }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="px-3 py-1.5 bg-[#FF6B00] text-white text-xs font-semibold rounded-lg hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
      >
        Đặt Chỗ
      </button>
      {open && (
        <BookingModal
          tourId={tourId}
          tourName={tourName}
          schedules={[schedule]}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export default function BookingScheduleButton(props: Props) {
  return (
    <ErrorBoundary moduleName="TourBooking">
      <InnerButton {...props} />
    </ErrorBoundary>
  )
}
