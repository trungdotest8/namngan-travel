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
  appendDelta:  (id, delta) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m,
      ),
    })),
  setStreaming: (v) => set({ isStreaming: v }),
  setError:    (e) => set({ error: e }),
  clear:       () => set({ messages: [], isStreaming: false, error: null }),
}))
