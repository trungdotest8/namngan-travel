import Anthropic from '@anthropic-ai/sdk'
import type { MessageRole } from '@/types/ai.types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface StreamMessage {
  role: MessageRole
  content: string
}

/**
 * Tạo streaming response từ Claude.
 * Trả về ReadableStream gửi từng text delta dưới dạng SSE "data: <chunk>\n\n".
 * Dòng cuối: "data: [DONE]\n\n"
 */
export function streamChatResponse(
  systemPrompt: string,
  messages: StreamMessage[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = `data: ${JSON.stringify({ content: event.delta.text })}\n\n`
            controller.enqueue(encoder.encode(chunk))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        )
        controller.close()
      }
    },
  })
}
