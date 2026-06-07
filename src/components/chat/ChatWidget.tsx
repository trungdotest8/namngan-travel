'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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

type Tab         = 'lead' | 'ai'
type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

// ── Tab Lead (form gốc) ────────────────────────────────────────────────────
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

// ── Tab AI Chat ────────────────────────────────────────────────────────────
function AiChatTab() {
  const { messages, isStreaming, error, addMessage, appendDelta, setStreaming, setError } =
    useAiChatStore()
  const [input, setInput]     = useState('')
  const bottomRef              = useRef<HTMLDivElement>(null)
  const inputRef               = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')

    const userMsg: AiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date(),
    }
    addMessage(userMsg)

    const assistantId = crypto.randomUUID()
    const assistantMsg: AiMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }
    addMessage(assistantMsg)
    setStreaming(true)
    setError(null)

    try {
      const history = useAiChatStore
        .getState()
        .messages.slice(0, -1) // loại placeholder assistant vừa thêm
        .map((m) => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: text })

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
            if (parsed.content)       appendDelta(assistantId, parsed.content)
            else if (parsed.error)    setError(parsed.error)
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {isEmpty && (
          <div className="text-center pt-4">
            <Bot size={28} className="mx-auto text-brand-blue/40 mb-2" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Xin chào! Tôi là TripGenie.<br />
              Hãy cho tôi biết bạn muốn đi đâu?
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
              ${msg.role === 'assistant' ? 'bg-brand-blue/10' : 'bg-gray-100'}`}>
              {msg.role === 'assistant'
                ? <Bot size={13} className="text-brand-blue" />
                : <UserIcon size={13} className="text-gray-500" />}
            </div>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words
                ${msg.role === 'user'
                  ? 'bg-brand-blue text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
            >
              {msg.content || (msg.role === 'assistant' && isStreaming
                ? <span className="inline-block w-4 h-1 bg-gray-400 rounded animate-pulse" />
                : null)}
            </div>
          </div>
        ))}
        {error && (
          <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-3 py-2 flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Nhập tin nhắn…"
          disabled={isStreaming}
          className="flex-1 text-xs px-2.5 py-2 border border-gray-200 rounded-lg outline-none bg-gray-50
                     focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10
                     disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
          className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center
                     hover:bg-brand-light transition-colors disabled:opacity-40 flex-shrink-0"
          aria-label="Gửi"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Widget chính ───────────────────────────────────────────────────────────
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
