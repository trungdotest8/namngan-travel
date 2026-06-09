'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Sparkles, Loader2, Copy, Check,
  MessageSquare, RotateCcw, ExternalLink,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AffiliateLinkItem {
  id:           string
  provider:     string
  label:        string
  tracking_url: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BUDGET_OPTIONS = [
  { value: 'Tiết kiệm (dưới 5 triệu/người)',   label: 'Tiết kiệm — dưới 5 triệu/người' },
  { value: 'Trung bình (5–15 triệu/người)',     label: 'Trung bình — 5–15 triệu/người' },
  { value: 'Cao cấp (15–30 triệu/người)',       label: 'Cao cấp — 15–30 triệu/người' },
  { value: 'Luxury (trên 30 triệu/người)',      label: 'Luxury — trên 30 triệu/người' },
]

const DAY_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14]

// ── Markdown renderer ─────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineFmt(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#005BAA] underline font-medium hover:text-[#0078D7] break-words">$1 ↗</a>',
    )
}

function renderMarkdown(text: string): string {
  const lines = text.split('\n')
  const parts: string[] = []
  let inList   = false
  let paraBuf: string[] = []

  const flushPara = () => {
    if (paraBuf.length === 0) return
    parts.push(`<p class="mb-2 text-gray-700 leading-relaxed">${paraBuf.join('<br/>')}</p>`)
    paraBuf = []
  }

  const closeList = () => {
    if (!inList) return
    parts.push('</ul>')
    inList = false
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.startsWith('## ')) {
      flushPara(); closeList()
      parts.push(
        `<h3 class="text-base font-bold text-[#005BAA] mt-6 mb-2 pb-1.5 border-b border-blue-100">${inlineFmt(escHtml(line.slice(3)))}</h3>`,
      )
    } else if (line.startsWith('### ')) {
      flushPara(); closeList()
      parts.push(
        `<h4 class="text-sm font-semibold text-[#1A1A2E] mt-3 mb-1">${inlineFmt(escHtml(line.slice(4)))}</h4>`,
      )
    } else if (/^[-*] /.test(line)) {
      flushPara()
      if (!inList) { parts.push('<ul class="mb-3 space-y-1">'); inList = true }
      parts.push(
        `<li class="flex gap-2 text-gray-700 text-sm"><span class="text-[#005BAA] shrink-0 mt-0.5">•</span><span>${inlineFmt(escHtml(line.slice(2)))}</span></li>`,
      )
    } else if (line.trim() === '') {
      flushPara(); closeList()
      parts.push('<div class="h-1.5"/>')
    } else {
      closeList()
      paraBuf.push(inlineFmt(escHtml(line)))
    }
  }

  flushPara(); closeList()
  return parts.join('')
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ItineraryBuilder() {
  const [destination, setDestination] = useState('')
  const [days,        setDays]        = useState(5)
  const [budget,      setBudget]      = useState(BUDGET_OPTIONS[1].value)
  const [travelers,   setTravelers]   = useState(2)
  const [preferences, setPreferences] = useState('')

  const [streamText,     setStreamText]     = useState('')
  const [isStreaming,    setIsStreaming]     = useState(false)
  const [isDone,         setIsDone]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLinkItem[]>([])
  const [copied,         setCopied]         = useState(false)

  const outputRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  const generate = useCallback(async () => {
    if (!destination.trim() || isStreaming) return

    setStreamText('')
    setAffiliateLinks([])
    setIsDone(false)
    setError(null)
    setIsStreaming(true)

    try {
      const res = await fetch('/api/ai/itinerary', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destination.trim(),
          days,
          budget,
          travelers,
          preferences: preferences.trim() || undefined,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`API error ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { setIsDone(true); break outer }
          try {
            const parsed = JSON.parse(data)
            if (parsed.content)          setStreamText(prev => prev + parsed.content)
            if (parsed.affiliate_links)  setAffiliateLinks(parsed.affiliate_links)
            if (parsed.error)            setError(parsed.error)
          } catch { /* ignore malformed */ }
        }
      }
    } catch {
      setError('Không thể kết nối AI. Vui lòng thử lại.')
    } finally {
      setIsStreaming(false)
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [destination, days, budget, travelers, preferences, isStreaming])

  const reset = () => {
    setStreamText('')
    setAffiliateLinks([])
    setIsDone(false)
    setError(null)
    setIsStreaming(false)
    inputRef.current?.focus()
  }

  const copyText = () => {
    navigator.clipboard.writeText(streamText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasOutput = streamText.length > 0

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Form ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Destination */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-[10px] font-bold text-[#1A1A2E] mb-1.5 uppercase tracking-widest">
              Điểm đến *
            </label>
            <input
              ref={inputRef}
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="Nhật Bản, Trung Quốc, Đà Lạt…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A1A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#005BAA] focus:ring-1 focus:ring-[#005BAA]/20 transition-colors"
            />
          </div>

          {/* Days */}
          <div>
            <label className="block text-[10px] font-bold text-[#1A1A2E] mb-1.5 uppercase tracking-widest">
              Số ngày
            </label>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#005BAA] bg-white appearance-none cursor-pointer"
            >
              {DAY_OPTIONS.map(d => (
                <option key={d} value={d}>{d} ngày</option>
              ))}
            </select>
          </div>

          {/* Travelers */}
          <div>
            <label className="block text-[10px] font-bold text-[#1A1A2E] mb-1.5 uppercase tracking-widest">
              Số người
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={travelers}
              onChange={e => setTravelers(Math.max(1, Math.min(50, Number(e.target.value))))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#005BAA] focus:ring-1 focus:ring-[#005BAA]/20 transition-colors"
            />
          </div>

          {/* Budget */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[10px] font-bold text-[#1A1A2E] mb-1.5 uppercase tracking-widest">
              Ngân sách
            </label>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map(b => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setBudget(b.value)}
                  className={[
                    'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                    budget === b.value
                      ? 'bg-[#005BAA] text-white border-[#005BAA]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#005BAA] hover:text-[#005BAA]',
                  ].join(' ')}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[10px] font-bold text-[#1A1A2E] mb-1.5 uppercase tracking-widest">
              Sở thích / Yêu cầu đặc biệt
              <span className="ml-1 font-normal text-gray-400 normal-case">(tuỳ chọn)</span>
            </label>
            <textarea
              value={preferences}
              onChange={e => setPreferences(e.target.value)}
              placeholder="VD: thích ẩm thực địa phương, ưu tiên khách sạn 3 sao, có trẻ em 5 tuổi, tự túc hoặc tour…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A1A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#005BAA] focus:ring-1 focus:ring-[#005BAA]/20 resize-none transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={generate}
            disabled={!destination.trim() || isStreaming}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B00] hover:bg-orange-600 text-white font-bold rounded-full text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isStreaming
              ? <><Loader2 size={15} className="animate-spin" />Đang tạo lịch trình…</>
              : <><Sparkles size={15} />Tạo lịch trình ngay</>
            }
          </button>
          {hasOutput && !isStreaming && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm border border-gray-200 hover:border-gray-300 rounded-full transition-colors"
            >
              <RotateCcw size={13} />
              Tạo lại
            </button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* ── Output ── */}
      {hasOutput && (
        <div
          ref={outputRef}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
          {/* Output header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={14} className="text-[#005BAA] shrink-0" />
              <span className="font-semibold text-sm text-[#1A1A2E] truncate">
                Lịch trình {days} ngày — {destination}
              </span>
              {isStreaming && (
                <span className="text-[11px] text-gray-400 font-normal shrink-0">đang soạn…</span>
              )}
            </div>
            {isDone && (
              <button
                onClick={copyText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full transition-colors shrink-0 ml-2"
              >
                {copied
                  ? <><Check size={12} className="text-green-500" />Đã sao chép</>
                  : <><Copy size={12} />Sao chép</>
                }
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-5 py-5">
            {isStreaming && !streamText ? (
              <div className="flex items-center gap-3 py-10 text-gray-400">
                <Loader2 size={20} className="animate-spin text-[#005BAA]" />
                <span className="text-sm">TripGenie đang soạn lịch trình của bạn…</span>
              </div>
            ) : isDone ? (
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(streamText) }}
              />
            ) : (
              <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                {streamText}
              </pre>
            )}
          </div>

          {/* Affiliate cards — hiện sau khi done */}
          {isDone && affiliateLinks.length > 0 && (
            <div className="px-5 pb-4">
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                  Đối tác đặt dịch vụ
                </p>
                <div className="flex flex-wrap gap-2">
                  {affiliateLinks.map(link => (
                    <a
                      key={link.id}
                      href={link.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-[#005BAA] hover:text-[#005BAA] hover:bg-[#F0F7FF] transition-all"
                    >
                      <ExternalLink size={11} className="shrink-0" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Zalo CTA */}
          {isDone && (
            <div className="px-5 pb-5">
              <div className="bg-[#F0F7FF] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A2E]">
                    Muốn đặt tour trọn gói?
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Nam Ngân Travel có 49+ tour sẵn có — tư vấn viên sẽ báo giá trong 30 phút.
                  </p>
                </div>
                <a
                  href="https://zalo.me/0774623514"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005BAA] hover:bg-[#0078D7] text-white text-sm font-semibold rounded-full transition-colors whitespace-nowrap shrink-0"
                >
                  <MessageSquare size={14} />
                  Tư vấn qua Zalo
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
