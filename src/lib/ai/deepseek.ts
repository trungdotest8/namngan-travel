/**
 * DeepSeek API client — OpenAI-compatible.
 * Dùng làm replacement cho Anthropic SDK trong toàn bộ TripGenie.
 *
 * Endpoint: https://api.deepseek.com/v1/chat/completions
 */
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionRequest {
  model: string
  max_tokens: number
  messages: DeepSeekMessage[]
  stream?: boolean
}

interface ChatCompletionChunkDelta {
  role?: string
  content?: string
}

interface ChatCompletionChunkChoice {
  index: number
  delta: ChatCompletionChunkDelta
  finish_reason: string | null
}

interface ChatCompletionChunk {
  id: string
  object: string
  created: number
  model: string
  choices: ChatCompletionChunkChoice[]
}

/**
 * Gọi DeepSeek non-streaming (dùng cho classify, content gen, landing page).
 */
export async function callDeepSeek(
  system: string,
  userContent: string,
  maxTokens = 1024,
  modelOverride?: string,
): Promise<string> {
  if (!DEEPSEEK_KEY) {
    throw new Error('DEEPSEEK_API_KEY chưa cấu hình')
  }

  const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: modelOverride || DEEPSEEK_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    } satisfies ChatCompletionRequest),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DeepSeek API ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

/**
 * Streaming qua DeepSeek — tương đương Anthropic messages.stream().
 * Trả về ReadableStream<Uint8Array> gửi SSE events "data: {content}\n\n" + "data: [DONE]\n\n".
 */
export function streamDeepSeek(
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens = 1024,
  modelOverride?: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        if (!DEEPSEEK_KEY) {
          throw new Error('DEEPSEEK_API_KEY chưa cấu hình')
        }

        const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_KEY}`,
          },
          body: JSON.stringify({
            model: modelOverride || DEEPSEEK_MODEL,
            max_tokens: maxTokens,
            stream: true,
            messages: [
              { role: 'system', content: system },
              ...messages,
            ],
          }),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`DeepSeek API ${res.status}: ${text}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const jsonStr = trimmed.slice(6)
            if (jsonStr === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              return
            }

            try {
              const chunk: ChatCompletionChunk = JSON.parse(jsonStr)
              const content = chunk.choices?.[0]?.delta?.content || ''
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
                )
              }
            } catch {
              // skip malformed chunk
            }
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
