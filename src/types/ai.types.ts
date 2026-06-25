export type MessageRole = 'user' | 'assistant'

export interface StreamMessage {
  role: MessageRole
  content: string
}

export interface AiMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: Date
}

export interface ConversationContext {
  sessionId: string
  leadId?: string
  /** Tour đang xem khi mở chat */
  currentTourId?: string
  /** Điểm đến đang xem */
  currentDestination?: string
}

export interface AiChatRequest {
  messages: { role: MessageRole; content: string }[]
  context?: Partial<ConversationContext>
}

export interface AiChatStreamChunk {
  type: 'delta' | 'done' | 'error'
  content?: string
  error?: string
}
