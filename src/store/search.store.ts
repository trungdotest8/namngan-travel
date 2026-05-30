'use client'

import { create } from 'zustand'
import type { Tour } from '@/types'

// v2.0.0 — field names khớp với DB schema (breaking change từ v1.0.0)
export interface SearchCriteria {
  category:      string   // tours.category ("trong nước" | "nước ngoài") — auto-derived
  destination:   string   // tours.destination
  tourName:      string   // tours.name
  meetingPoint:  string   // tour_schedules.meeting_point
  departureDate: string   // tour_schedules.departure_date (YYYY-MM-DD)
  adults:        number   // bookings.adults (min 1)
  children:      number   // bookings.children (min 0)
}

interface SearchState {
  criteria:    SearchCriteria
  results:     Tour[]
  isSearching: boolean
  hasSearched: boolean
  error:       string | null

  setCriteria:  (patch: Partial<SearchCriteria>) => void
  setResults:   (tours: Tour[]) => void
  setSearching: (v: boolean) => void
  setError:     (msg: string | null) => void
  reset:        () => void
}

const defaultCriteria: SearchCriteria = {
  category:      '',
  destination:   '',
  tourName:      '',
  meetingPoint:  '',
  departureDate: '',
  adults:        2,
  children:      0,
}

export const useSearchStore = create<SearchState>((set) => ({
  criteria:    defaultCriteria,
  results:     [],
  isSearching: false,
  hasSearched: false,
  error:       null,

  setCriteria: (patch) =>
    set((s) => ({ criteria: { ...s.criteria, ...patch } })),

  setResults: (tours) =>
    set({ results: tours, hasSearched: true, isSearching: false, error: null }),

  setSearching: (v) => set({ isSearching: v }),

  setError: (msg) => set({ error: msg, isSearching: false }),

  reset: () =>
    set({ criteria: defaultCriteria, results: [], hasSearched: false, error: null }),
}))
