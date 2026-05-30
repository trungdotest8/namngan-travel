import { create } from 'zustand'
import type { Lead } from '@/types/lead.types'

export type CRMFilter = 'all' | 'fb_ads' | 'web_ads' | 'deposited' | 'new'
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface CustomerProfileState {
  customers: Lead[]
  selectedId: string | null
  isDrawerOpen: boolean
  uploadStatus: UploadStatus
  uploadError: string | null
  filter: CRMFilter
  search: string
  isLoading: boolean

  setCustomers: (customers: Lead[]) => void
  openDrawer: (id: string) => void
  closeDrawer: () => void
  updateCustomer: (id: string, patch: Partial<Lead>) => void
  setUploadStatus: (status: UploadStatus, error?: string) => void
  setFilter: (filter: CRMFilter) => void
  setSearch: (search: string) => void
  setLoading: (loading: boolean) => void
}

export const useCustomerProfileStore = create<CustomerProfileState>((set) => ({
  customers: [],
  selectedId: null,
  isDrawerOpen: false,
  uploadStatus: 'idle',
  uploadError: null,
  filter: 'all',
  search: '',
  isLoading: false,

  setCustomers: (customers) => set({ customers }),
  openDrawer: (id) => set({ selectedId: id, isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false, selectedId: null }),
  updateCustomer: (id, patch) =>
    set((state) => ({
      customers: state.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  setUploadStatus: (uploadStatus, uploadError) =>
    set({ uploadStatus, uploadError: uploadError ?? null }),
  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  setLoading: (isLoading) => set({ isLoading }),
}))

// Selectors
export const selectSelectedCustomer = (state: CustomerProfileState): Lead | null =>
  state.customers.find((c) => c.id === state.selectedId) ?? null

export const selectFilteredCustomers = (state: CustomerProfileState): Lead[] => {
  const { customers, filter, search } = state
  const q = search.toLowerCase()
  return customers.filter((c) => {
    const matchFilter =
      filter === 'all' ||
      (filter === 'fb_ads' && c.lead_source === 'fb_ads') ||
      (filter === 'web_ads' && (c.lead_source === 'web_ads' || c.lead_source === 'organic')) ||
      (filter === 'deposited' && (c.status === 'deposited' || c.status === 'converted')) ||
      (filter === 'new' && c.status === 'new')
    const matchSearch =
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    return matchFilter && matchSearch
  })
}
