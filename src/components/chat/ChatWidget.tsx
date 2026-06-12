'use client'

/**
 * ChatWidget — widget chat nổi góc phải màn hình.
 *
 * Kiến trúc AiChatTab tối ưu hiệu năng:
 * ┌ AiChatTab        — layout thuần, KHÔNG subscribe store
 * ├── AiChatMessages — subscribe: messages, isStreaming, error; smart-scroll; memo
 * │   └── ChatMessage × N — React.memo: chỉ re-render tin nhắn đang stream
 * └── AiInput        — React.memo; local state; owns sendMessage; subscribe isStreaming
 *
 * Gõ chữ vào AiInput KHÔNG kích hoạt bất kỳ re-render nào ở danh sách tin nhắn.
 * Mỗi token stream chỉ re-render ChatMessage cuối — toàn bộ tin nhắn cũ đóng băng.
 */

import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Bot, User as UserIcon } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LeadFormSchema } from '@/lib/validations/lead.schema'
import { useAiChatStore } from '@/store/ai-chat.store'
import type { AiMessage } from '@/types/ai.types'

const ZALO_URL = process.env.NEXT_PUBLIC_ZALO_URL ?? 'https://zalo.me/0774623514'

function readUtm() {
  const p = new URLSearchParams(window.location.search)
  return {
    utm_source:   p.get('utm_source')   ?? undefined,
    utm_medium:   p.get('utm_medium')   ?? undefined,
    utm_campaign: p.get('utm_campaign') ?? undefined,
  }
}

type Tab          = 'lead' | 'ai'
type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

// Số tin nhắn tối đa hiển thị trong DOM cùng lúc
const MAX_VISIBLE_MESSAGES = 30

// ── LeadTab ────────────────────────────────────────────────────────────────────
function LeadTab() {
  const [name,   setName]   = useState('')
  const [phone,  setPhone]  = useState('')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [status, setStatus] = useState<SubmitStatus>('idle')

  const validate = () => {
    const parsed = LeadFormSchema.safeParse({
      full_name:   name.trim(),
      phone:       phone.trim().replace(/\s/g, ''),
      lead_source: 'chat',
    })
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setErrors({ name: fe.full_name?.[0], phone: fe.phone?.[0] })
      return false
    }
    setErrors({})
    return true
  }

  const submit = async () => {
    if (!validate() || status === 'loading') return
    setStatus('loading')
    try {
      const res = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:   name.trim(),
          phone:       phone.trim().replace(/\s/g, ''),
          lead_source: 'chat',
          source_page: window.location.href,
          ...readUtm(),
        }),
      })
      if (!res.ok) throw new Error('API error')
      setStatus('success')
      setTimeout(() => window.open(ZALO_URL, '_blank'), 1200)
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="px-4 py-7 text-center">
        <p className="text-sm text-gray-500 leading-relaxed">
          Đang chuyển đến Zalo tư vấn…<br />
          <span className="text-xs text-gray-400">Thông tin đã được ghi nhận.</span>
        </p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {status === 'error' && (
        <p className="text-xs text-red-500 mb-3 bg-red-50 px-3 py-2 rounded-lg">
          Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ qua Zalo trực tiếp.
        </p>
      )}
      <div className="mb-3">
        <label htmlFor="cw-name" className="block text-xs text-gray-500 mb-1">Họ và tên</label>
        <input
          id="cw-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          className={`w-full text-sm px-2.5 py-2 border rounded-lg outline-none bg-gray-50 text-gray-900 transition-colors
            focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10
            ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
        />
        {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
      </div>
      <div className="mb-3">
        <label htmlFor="cw-phone" className="block text-xs text-gray-500 mb-1">Số điện thoại</label>
        <input
          id="cw-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0901 234 567"
          autoComplete="tel"
          className={`w-full text-sm px-2.5 py-2 border rounded-lg outline-none bg-gray-50 text-gray-900 transition-colors
            focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10
            ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
        />
        {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>}
      </div>
      <button
        onClick={submit}
        disabled={status === 'loading'}
        className="w-full py-2.5 bg-brand-blue hover:bg-brand-light text-white text-sm font-semibold rounded-lg
                   flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97]
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Send size={14} />
        {status === 'loading' ? 'Đang gửi…' : 'Bắt đầu tư vấn'}
      </button>
    </div>
  )
}

// ── ChatMessage ────────────────────────────────────────────────────────────────
// React.memo + custom comparator: chỉ re-render khi content của tin nhắn này đổi.
const ChatMessage = memo(
  function ChatMessage({ msg, showStreaming }: { msg: AiMessage; showStreaming: boolean }) {
    const isUser = msg.role === 'user'
    return (
      <div className={`flex items-end gap-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
          ${isUser ? 'bg-gray-100' : 'bg-brand-blue/10'}`}>
          {isUser
            ? <UserIcon size={13} className="text-gray-500" />
            : <Bot size={13} className="text-brand-blue" />}
        </div>
        <div
          className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words
            ${isUser
              ? 'bg-brand-blue text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
        >
          {msg.content || (msg.role === 'assistant' && showStreaming
            ? <span className="inline-block w-4 h-1 bg-gray-400 rounded animate-pulse" />
            : null)}
        </div>
      </div>
    )
  },
  (prev, next) =>
    prev.msg.id === next.msg.id &&
    prev.msg.content === next.msg.content &&
    prev.showStreaming === next.showStreaming,
)
ChatMessage.displayName = 'ChatMessage'

// ── AiChatMessages ─────────────────────────────────────────────────────────────
// Component riêng subscribe messages — AiChatTab KHÔNG cần subscribe.
// Smart-scroll: rAF throttle, khóa khi user cuộn lên đọc lịch sử.
const AiChatMessages = memo(function AiChatMessages() {
  const messages    = useAiChatStore((s) => s.messages)
  const isStreaming = useAiChatStore((s) => s.isStreaming)
  const error       = useAiChatStore((s) => s.error)

  const containerRef        = useRef<HTMLDivElement>(null)
  const userScrollingUpRef   = useRef(false)
  const rafPendingRef        = useRef(false)
  const prevLengthRef        = useRef(0)

  const isNearBottom = useCallback(() => {
    const el = containerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  const scheduleScroll = useCallback(() => {
    if (rafPendingRef.current || userScrollingUpRef.current) return
    rafPendingRef.current = true
    requestAnimationFrame(() => {
      rafPendingRef.current = false
      if (!userScrollingUpRef.current) scrollToBottom()
    })
  }, [scrollToBottom])

  // Tin nhắn mới → reset lock + scroll ngay
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      prevLengthRef.current = messages.length
      userScrollingUpRef.current = false
      scrollToBottom()
    }
  }, [messages.length, scrollToBottom])

  // Stream đang chạy → scroll throttled qua rAF
  useEffect(() => {
    if (isStreaming) scheduleScroll()
  }, [messages, isStreaming, scheduleScroll])

  const onScroll = useCallback(() => {
    userScrollingUpRef.current = !isNearBottom()
  }, [isNearBottom])

  const isEmpty = messages.length === 0

  // Giới hạn DOM: chỉ render tin nhắn gần nhất
  const visible = messages.length > MAX_VISIBLE_MESSAGES
    ? messages.slice(messages.length - MAX_VISIBLE_MESSAGES)
    : messages

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0"
    >
      {isEmpty && (
        <div className="text-center pt-4">
          <Bot size={28} className="mx-auto text-brand-blue/40 mb-2" />
          <p className="text-xs text-gray-400 leading-relaxed">
            Xin chào! Tôi là TripGenie.<br />
            Hãy cho tôi biết bạn muốn đi đâu?
          </p>
        </div>
      )}
      {visible.map((msg) => (
        <ChatMessage key={msg.id} msg={msg} showStreaming={isStreaming} />
      ))}
      {error && (
        <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
    </div>
  )
})
AiChatMessages.displayName = 'AiChatMessages'

// ── AiInput ────────────────────────────────────────────────────────────────────
// State text hoàn toàn cục bộ — gõ chữ không ảnh hưởng AiChatMessages bên trên.
// Chứa toàn bộ sendMessage logic, dùng getState() → không bao giờ stale.
// Input KHÔNG bị disabled khi AI đang stream (user có thể gõ sẵn câu tiếp theo).
const AiInput = memo(function AiInput() {
  const [text, setText]  = useState('')
  const inputRef         = useRef<HTMLInputElement>(null)
  // Subscribe isStreaming để enable/disable nút Gửi
  const isStreaming       = useAiChatStore((s) => s.isStreaming)

  // Tự động focus sau khi AI trả lời xong
  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus()
  }, [isStreaming])

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    // Đọc state hiện tại — không stale closure
    const { isStreaming: streaming, addMessage, appendDelta, setStreaming, setError } =
      useAiChatStore.getState()
    if (streaming) return

    setText('')

    const userMsg: AiMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   trimmed,
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
      history.push({ role: 'user', content: trimmed })

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
  }, [text]) // chỉ phụ thuộc text — stable khi user không gõ

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSend() }
  }

  return (
    <div className="border-t border-gray-100 px-3 py-2 flex gap-2 items-center">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Nhập tin nhắn…"
        className="flex-1 text-xs px-2.5 py-2 border border-gray-200 rounded-lg outline-none bg-gray-50
                   focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || isStreaming}
        className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center
                   hover:bg-brand-light transition-colors disabled:opacity-40 flex-shrink-0"
        aria-label="Gửi"
      >
        <Send size={13} />
      </button>
    </div>
  )
})
AiInput.displayName = 'AiInput'

// ── AiChatTab ──────────────────────────────────────────────────────────────────
// Pure layout component — không subscribe bất kỳ store nào.
// KHÔNG bao giờ re-render do stream. Chỉ re-render khi tab switch.
function AiChatTab() {
  return (
    <div className="flex flex-col h-full">
      <AiChatMessages />
      <AiInput />
    </div>
  )
}

// ── ChatWidgetInner ────────────────────────────────────────────────────────────
function ChatWidgetInner() {
  const [isOpen, setIsOpen] = useState(false)
  const [tab,    setTab]    = useState<Tab>('lead')

  const toggle = () => setIsOpen((o) => !o)

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-[9999] font-sans">
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tư vấn du lịch"
          className="absolute bottom-[72px] right-0 w-[min(300px,calc(100vw-2rem))] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ height: tab === 'ai' ? 420 : 'auto' }}
        >
          {/* Header */}
          <div className="bg-brand-blue px-4 py-3 flex justify-between items-center flex-shrink-0">
            <div>
              <p className="text-white text-sm font-semibold">Tư vấn miễn phí</p>
              <p className="text-white/80 text-xs mt-0.5">Phản hồi trong vòng 5 phút</p>
            </div>
            <button
              onClick={toggle}
              aria-label="Đóng"
              className="text-white/75 hover:text-white p-1 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => setTab('lead')}
              className={`flex-1 py-2 text-xs font-medium transition-colors
                ${tab === 'lead' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Để lại số
            </button>
            <button
              onClick={() => setTab('ai')}
              className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors
                ${tab === 'ai' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Bot size={12} />
              Chat AI
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {tab === 'lead' ? <LeadTab /> : <AiChatTab />}
          </div>
        </div>
      )}

      {/* Nút bong bóng */}
      <button
        onClick={toggle}
        aria-label={isOpen ? 'Đóng chat tư vấn' : 'Mở chat tư vấn'}
        className="w-14 h-14 rounded-full bg-brand-blue text-white flex items-center justify-center
                   shadow-lg hover:scale-110 active:scale-95 transition-transform animate-chat-pulse relative"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={26} fill="white" />}
        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" aria-hidden />
        )}
      </button>
    </div>
  )
}

export default function ChatWidget() {
  return (
    <ErrorBoundary moduleName="ChatWidget">
      <ChatWidgetInner />
    </ErrorBoundary>
  )
}
