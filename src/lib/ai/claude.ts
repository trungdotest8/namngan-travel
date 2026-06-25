import type { StreamMessage } from '@/types/ai.types'
import { streamDeepSeek } from './deepseek'

// Re-export for modules that import StreamMessage từ đây
export type { StreamMessage }

/**
 * Streaming chat response — dùng DeepSeek (OpenAI-compatible).
 * DeepSeek API hỗ trợ streaming SSE giống Anthropic.
 */
export function streamChatResponse(
  systemPrompt: string,
  messages: StreamMessage[],
  maxTokens = 1024,
): ReadableStream<Uint8Array> {
  return streamDeepSeek(systemPrompt, messages, maxTokens)
}
