import { create } from 'zustand'
import type { AiMessage, ConversationContext } from '@/types/ai.types'

interface AiChatState {
  messages:    AiMessage[]
  isStreaming: boolean
  error:       string | null
  context:     Partial<ConversationContext>

  setContext:   (ctx: Partial<ConversationContext>) => void
  addMessage:   (msg: AiMessage) => void
  appendDelta:  (id: string, delta: string) => void
  setStreaming: (v: boolean) => void
  setError:     (e: string | null) => void
  clear:        () => void
}

export const useAiChatStore = create<AiChatState>((set) => ({
  messages:    [],
  isStreaming: false,
  error:       null,
  context:     {},

  setContext:   (ctx) => set((s) => ({ context: { ...s.context, ...ctx } })),
  addMessage:   (msg) => set((s) => ({ messages: [...s.messages, msg], error: null })),
  // Dùng index thay map() — chỉ tạo 1 object mới (tin nhắn đang stream),
  // giữ nguyên reference của N-1 tin nhắn cũ → React.memo hoạt động đúng.
  appendDelta:  (id, delta) =>
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === id)
      if (idx === -1) return {}
      const updated = { ...s.messages[idx], content: s.messages[idx].content + delta }
      const messages = s.messages.slice()
      messages[idx] = updated
      return { messages }
    }),
  setStreaming: (v) => set({ isStreaming: v }),
  setError:    (e) => set({ error: e }),
  clear:       () => set({ messages: [], isStreaming: false, error: null }),
}))
