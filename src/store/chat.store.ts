import { create } from 'zustand'

interface ChatState {
  isWidgetOpen: boolean
  toggleWidget:  () => void
  openWidget:    () => void
  closeWidget:   () => void
}

export const useChatStore = create<ChatState>((set) => ({
  isWidgetOpen: false,
  toggleWidget:  () => set((s) => ({ isWidgetOpen: !s.isWidgetOpen })),
  openWidget:    () => set({ isWidgetOpen: true }),
  closeWidget:   () => set({ isWidgetOpen: false }),
}))
