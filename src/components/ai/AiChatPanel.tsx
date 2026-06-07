'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Bot, Send, RotateCcw, Sparkles } from 'lucide-react'
import { useAiChatStore } from '@/store/ai-chat.store'
import type { AiMessage } from '@/types/ai.types'

const SUGGESTED = [
  'Tour Nhật Bản 7 ngày giá bao nhiêu?',
  'Tư vấn lịch trình Hàn Quốc 5 ngày',
  'Tour Đà Nẵng – Hội An dịp hè',
  'Visa Trung Quốc cần thủ tục gì?',
]

export function AiChatPanel() {
  const {
    messages, isStreaming, error,
    addMessage, appendDelta, setStreaming, setError, clear,
  } = useAiChatStore()

  const [input, setInput]   = useState('')
  const bottomRef           = useRef<HTMLDivElement>(null)
  const inputRef            = useRef<HTMLTextAreaElement>(null)
  const isEmpty             = messages.length === 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const sendMessage = useCallback(async (text?: string) => {
    const query = (text ?? input).trim()
    if (!query || isStreaming) return
    setInput('')

    const userMsg: AiMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   query,
      createdAt: new Date(),
    }
    addMessage(userMsg)

    const assistantId = crypto.randomUUID()
    addMessage({ id: assistantId, role: 'assistant', content: '', createdAt: new Date() })
    setStreaming(true)
    setError(null)

    try {
      const history = useAiChatStore
        .getState()
        .messages.slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: query })

      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history }),
      })

      if (!res.ok || !res.body) throw new Error('API error')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.content)    appendDelta(assistantId, parsed.content)
            else if (parsed.error) setError(parsed.error)
          } catch { /* ignore malformed */ }
        }
      }
    } catch {
      setError('Không thể kết nối AI. Vui lòng thử lại.')
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }, [input, isStreaming, addMessage, appendDelta, setStreaming, setError])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#005BAA] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">TripGenie AI</p>
            <p className="text-white/60 text-xs">Tư vấn du lịch — miễn phí</p>
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={clear}
            title="Xoá cuộc trò chuyện"
            className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <Bot size={36} className="text-[#005BAA]/30 mb-3" />
            <p className="text-[#1A1A2E] font-semibold mb-1">Xin chào! Tôi là TripGenie</p>
            <p className="text-[#666666] text-sm mb-6">Hãy cho tôi biết bạn muốn đi đâu?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 bg-[#F0F7FF] hover:bg-[#005BAA]/10 text-[#005BAA] rounded-full border border-[#005BAA]/20 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)
        )}

        {isStreaming && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 bg-[#005BAA] rounded-full flex items-center justify-center shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="px-3 py-2 bg-gray-100 rounded-2xl rounded-bl-sm">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-xs text-red-500 py-1">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-100 px-3 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nhập câu hỏi… (Enter để gửi)"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#1A1A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#005BAA] focus:ring-1 focus:ring-[#005BAA]/20 disabled:opacity-50 max-h-32 overflow-y-auto leading-relaxed"
            style={{ height: 'auto', minHeight: '42px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 bg-[#005BAA] hover:bg-[#0078D7] disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          AI có thể mắc lỗi — vui lòng xác nhận với chuyên viên trước khi đặt tour.
        </p>
      </div>
    </div>
  )
}

function ChatBubble({ msg }: { msg: AiMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 bg-[#005BAA] rounded-full flex items-center justify-center shrink-0 mb-0.5">
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[#005BAA] text-white rounded-br-sm'
            : 'bg-gray-100 text-[#1A1A2E] rounded-bl-sm'
        }`}
      >
        {msg.content || <span className="opacity-40 italic">…</span>}
      </div>
    </div>
  )
}
