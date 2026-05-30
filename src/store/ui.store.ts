import { create } from 'zustand'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface UIState {
  // Toast notifications
  toasts: Toast[]
  addToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void

  // Modal
  activeModal: string | null
  openModal: (id: string) => void
  closeModal: () => void

  // Global loading
  isLoading: boolean
  setLoading: (value: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: crypto.randomUUID(), message, type },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  isLoading: false,
  setLoading: (value) => set({ isLoading: value }),
}))
