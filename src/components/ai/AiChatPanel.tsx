'use client'

/**
 * AiChatPanel — TripGenie AI Chat (trang /tao-lich-trinh)
 *
 * Kiến trúc tối ưu hiệu năng:
 * ┌ AiChatPanel     — subscribe: isStreaming, error, isEmpty (KHÔNG subscribe messages)
 * ├── MessageList   — subscribe: messages; quản lý smart-scroll; wrap memo
 * │   └── ChatBubble × N  — React.memo: chỉ re-render tin nhắn đang stream
 * └── ChatInput     — React.memo; local state; nhận onSend + isStreaming props
 *
 * Kết quả: khi mỗi token stream về, CHỈ ChatBubble của tin nhắn cuối cùng re-render.
 * Toàn bộ tin nhắn cũ và ô input hoàn toàn đóng băng (không re-render).
 */

import { memo, useRef, useEffect, useCallback, useState } from 'react'
import { Bot, Send, RotateCcw, Sparkles } from 'lucide-react'
import { useAiChatStore } from '@/store/ai-chat.store'
import type { AiMessage } from '@/types/ai.types'

const SUGGESTED = [
  'Tour Nhật Bản 7 ngày giá bao nhiêu?',
  'Tư vấn lịch trình Hàn Quốc 5 ngày',
  'Tour Đà Nẵng – Hội An dịp hè',
  'Visa Trung Quốc cần thủ tục gì?',
]

// Số tin nhắn tối đa hiển thị trong DOM cùng lúc (tránh DOM quá lớn)
const MAX_VISIBLE_MESSAGES = 30

// ── ChatBubble ────────────────────────────────────────────────────────────────
// React.memo + custom comparator: chỉ re-render khi chính xác tin nhắn này thay đổi.
// Nhờ appendDelta dùng index-based update, old messages giữ nguyên object reference
// → comparator trả về true → React bỏ qua re-render hoàn toàn.
const ChatBubble = memo(
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
          className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-[#005BAA] text-white rounded-br-sm'
              : 'bg-gray-100 text-[#1A1A2E] rounded-bl-sm'
          }`}
        >
          {msg.content || <span className="opacity-40 italic">…</span>}
        </div>
      </div>
    )
  },
  // Custom comparator: so sánh content (thay đổi mỗi token) và id (không đổi)
  (prev, next) => prev.msg.id === next.msg.id && prev.msg.content === next.msg.content,
)
ChatBubble.displayName = 'ChatBubble'

// ── TypingIndicator ────────────────────────────────────────────────────────────
// CSS animation thuần — không dùng JS loop, không gây scripting long task.
// Chỉ hiện khi AI chưa bắt đầu trả lời (content rỗng).
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 bg-[#005BAA] rounded-full flex items-center justify-center shrink-0">
        <Bot size={14} className="text-white" />
      </div>
      <div className="px-3 py-2 bg-gray-100 rounded-2xl rounded-bl-sm">
        <span className="inline-flex gap-1" aria-label="Đang soạn">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  )
}

// ── MessageList ───────────────────────────────────────────────────────────────
// Component riêng, subscribe messages từ store.
// Chứa toàn bộ logic smart-scroll để không để lọt lên component cha.
interface MessageListProps {
  isStreaming: boolean
  error:       string | null
  isEmpty:     boolean
  onSuggest:   (q: string) => void
}

const MessageList = memo(function MessageList({
  isStreaming, error, isEmpty, onSuggest,
}: MessageListProps) {
  // Subscribe messages tại đây — component cha KHÔNG cần subscribe
  const messages = useAiChatStore((s) => s.messages)

  const containerRef        = useRef<HTMLDivElement>(null)
  // true = user đang đọc lịch sử, khóa auto-scroll
  const userScrollingUpRef   = useRef(false)
  // Throttle scroll bằng requestAnimationFrame — tối đa 1 lần/frame
  const rafPendingRef        = useRef(false)
  // Theo dõi số lượng tin nhắn để detect tin mới
  const prevLengthRef        = useRef(0)

  // Kiểm tra xem người dùng có đang ở sát đáy không (ngưỡng 80px)
  const isNearBottom = useCallback(() => {
    const el = containerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }, [])

  // Cuộn xuống đáy ngay lập tức (instant) — không dùng smooth trong lúc stream
  const scrollToBottom = useCallback(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  // Lập lịch cuộn bằng rAF: tối đa 1 lần/frame (~60fps), không chặn main thread
  const scheduleScroll = useCallback(() => {
    if (rafPendingRef.current || userScrollingUpRef.current) return
    rafPendingRef.current = true
    requestAnimationFrame(() => {
      rafPendingRef.current = false
      if (!userScrollingUpRef.current) scrollToBottom()
    })
  }, [scrollToBottom])

  // Khi có tin nhắn MỚI (length tăng) → reset lock + force scroll ngay
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      prevLengthRef.current = messages.length
      userScrollingUpRef.current = false
      scrollToBottom()
    }
  }, [messages.length, scrollToBottom])

  // Trong quá trình stream (mỗi token) → scheduleScroll qua rAF throttle
  useEffect(() => {
    if (isStreaming) scheduleScroll()
  }, [messages, isStreaming, scheduleScroll])

  // Phát hiện user cuộn lên để đọc lịch sử → khóa auto-scroll
  const onScroll = useCallback(() => {
    userScrollingUpRef.current = !isNearBottom()
  }, [isNearBottom])

  // Chỉ hiện typing dots khi AI chưa bắt đầu viết (content còn rỗng)
  const lastMsg    = messages[messages.length - 1]
  const showTyping = isStreaming && (!lastMsg || (lastMsg.role === 'assistant' && lastMsg.content === ''))

  // Giới hạn DOM: chỉ render MAX_VISIBLE_MESSAGES tin nhắn gần nhất
  const visible = messages.length > MAX_VISIBLE_MESSAGES
    ? messages.slice(messages.length - MAX_VISIBLE_MESSAGES)
    : messages

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
    >
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-6">
          <Bot size={36} className="text-[#005BAA]/30 mb-3" />
          <p className="text-[#1A1A2E] font-semibold mb-1">Xin chào! Tôi là TripGenie</p>
          <p className="text-[#666666] text-sm mb-6">Hãy cho tôi biết bạn muốn đi đâu?</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => onSuggest(q)}
                className="text-xs px-3 py-1.5 bg-[#F0F7FF] hover:bg-[#005BAA]/10 text-[#005BAA] rounded-full border border-[#005BAA]/20 transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        visible.map((msg) => <ChatBubble key={msg.id} msg={msg} />)
      )}

      {showTyping && <TypingIndicator />}

      {error && (
        <p className="text-center text-xs text-red-500 py-1">{error}</p>
      )}
    </div>
  )
})
MessageList.displayName = 'MessageList'

// ── ChatInput ─────────────────────────────────────────────────────────────────
// State text hoàn toàn cục bộ — gõ chữ KHÔNG bao giờ kích hoạt re-render component cha
// hoặc danh sách tin nhắn bên trên. Input KHÔNG bị disable khi AI đang stream.
interface ChatInputProps {
  onSend:      (text: string) => void
  isStreaming: boolean
}

const ChatInput = memo(function ChatInput({ onSend, isStreaming }: ChatInputProps) {
  const [text, setText]  = useState('')
  const textareaRef      = useRef<HTMLTextAreaElement>(null)

  // Focus lại textarea sau khi AI trả lời xong
  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus()
  }, [isStreaming])

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [text, onSend])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="shrink-0 border-t border-gray-100 px-3 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Nhập câu hỏi… (Enter để gửi)"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#1A1A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#005BAA] focus:ring-1 focus:ring-[#005BAA]/20 max-h-32 overflow-y-auto leading-relaxed"
          style={{ height: 'auto', minHeight: '42px' }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 128) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || isStreaming}
          className="w-10 h-10 bg-[#005BAA] hover:bg-[#0078D7] disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors shrink-0"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5 text-center">
        AI có thể mắc lỗi — vui lòng xác nhận với chuyên viên trước khi đặt tour.
      </p>
    </div>
  )
})
ChatInput.displayName = 'ChatInput'

// ── AiChatPanel ───────────────────────────────────────────────────────────────
// Component cha chỉ subscribe 3 giá trị scalar từ store.
// Trong suốt quá trình stream (messages thay đổi mỗi token), component này
// KHÔNG re-render vì isStreaming/error/isEmpty không đổi.
export function AiChatPanel() {
  const isStreaming = useAiChatStore((s) => s.isStreaming)
  const error       = useAiChatStore((s) => s.error)
  // isEmpty chỉ thay đổi khi có tin nhắn đầu tiên hoặc khi clear — rất ít lần
  const isEmpty     = useAiChatStore((s) => s.messages.length === 0)

  // sendMessage dùng getState() bên trong → không cần dep list → stable reference
  // → ChatInput và MessageList.onSuggest không bị re-render khi callback này "thay đổi"
  const sendMessage = useCallback(async (query: string) => {
    const { isStreaming: streaming, addMessage, appendDelta, setStreaming, setError } =
      useAiChatStore.getState()
    if (!query || streaming) return

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
      // Lấy lịch sử mới nhất từ store (không dùng state đã capture)
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
          } catch { /* bỏ qua chunk lỗi định dạng */ }
        }
      }
    } catch {
      setError('Không thể kết nối AI. Vui lòng thử lại.')
    } finally {
      setStreaming(false)
    }
  }, []) // deps rỗng — stable reference, đọc state mới qua getState()

  const { clear } = useAiChatStore.getState()

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

      {/* Danh sách tin nhắn — component riêng, tự quản lý scroll */}
      <MessageList
        isStreaming={isStreaming}
        error={error}
        isEmpty={isEmpty}
        onSuggest={sendMessage}
      />

      {/* Input — hoàn toàn cô lập, gõ chữ không ảnh hưởng phần trên */}
      <ChatInput onSend={sendMessage} isStreaming={isStreaming} />
    </div>
  )
}
