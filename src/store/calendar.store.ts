'use client'

import { create } from 'zustand'
import type { TourSchedule, TourScheduleStatus } from '@/types'

interface FetchParams {
  destination?: string
  month?: string
  status?: TourScheduleStatus
  limit?: number
}

interface CalendarState {
  schedules: TourSchedule[]
  isLoading: boolean
  error: string | null
  lastFetched: string | null

  fetchSchedules: (params?: FetchParams) => Promise<void>
  clearSchedules: () => void
  setError: (msg: string | null) => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  schedules: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchSchedules: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const query = new URLSearchParams()
      if (params.destination) query.set('destination', params.destination)
      if (params.month)       query.set('month', params.month)
      if (params.status)      query.set('status', params.status)
      if (params.limit)       query.set('limit', String(params.limit))

      const res = await fetch(`/api/departures?${query.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json = await res.json()
      set({
        schedules: json.schedules ?? [],
        isLoading: false,
        lastFetched: new Date().toISOString(),
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Không thể tải lịch khởi hành',
        isLoading: false,
      })
    }
  },

  clearSchedules: () => set({ schedules: [], error: null, lastFetched: null }),

  setError: (msg) => set({ error: msg }),
}))
