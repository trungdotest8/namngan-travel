import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { streamChatResponse } from '@/lib/ai/claude'
import { buildTravelConsultantPrompt } from '@/lib/ai/prompts'
import { searchRelevantTours } from '@/lib/ai/rag'

export const runtime = 'edge'

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
})

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  context: z
    .object({
      currentTourId:      z.string().optional(),
      currentDestination: z.string().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI chưa được cấu hình. Vui lòng thêm ANTHROPIC_API_KEY.' },
      { status: 503 },
    )
  }

  try {
    const body = await req.json()
    const parsed = ChatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { messages, context } = parsed.data

    // RAG: tìm tour liên quan từ tin nhắn cuối của user → giảm context từ 49 → 3-5 tour
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    const relevantTours = lastUserMsg ? await searchRelevantTours(lastUserMsg.content) : []

    const systemPrompt = buildTravelConsultantPrompt(context, relevantTours)
    const stream = streamChatResponse(systemPrompt, messages)

    return new Response(stream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection:      'keep-alive',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Lỗi server, vui lòng thử lại.' }, { status: 500 })
  }
}
