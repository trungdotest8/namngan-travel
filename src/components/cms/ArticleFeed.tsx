'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, FileText, Rss, Video, Globe,
  Calendar, ExternalLink, Inbox,
} from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { Article, ArticleSourceType, ArticleStatus } from '@/types/news.types'

// ── Source config ─────────────────────────────────────────────

const SOURCE_CONFIG: Record<ArticleSourceType, {
  label: string
  Icon: React.ElementType
  badgeClass: string
  dotColor: string
}> = {
  manual:   { label: 'Biên tập', Icon: FileText, badgeClass: 'bg-blue-700/90 text-white',   dotColor: '#185FA5' },
  rss:      { label: 'Blog',     Icon: Rss,       badgeClass: 'bg-orange-600/90 text-white', dotColor: '#E8521A' },
  tiktok:   { label: 'TikTok',   Icon: Video,     badgeClass: 'bg-black/90 text-white',      dotColor: '#222222' },
  facebook: { label: 'Facebook', Icon: Globe,     badgeClass: 'bg-blue-500/90 text-white',   dotColor: '#1877F2' },
}

// ── Types ─────────────────────────────────────────────────────

type LogEntry = { time: string; type: 'ok' | 'err' | 'info'; msg: string }

interface ArticleInput {
  id: string
  title: string
  slug: string
  source_type: ArticleSourceType
  created_at: string
  summary?: string | null
  content?: string | null
  thumbnail_url?: string | null
  author_id?: string | null
  source_url?: string | null
  source_meta?: Record<string, unknown> | null
  tags?: string[]
  category?: string | null
  status?: ArticleStatus
  published_at?: string | null
  updated_at?: string | null
}

// ── Data layer ────────────────────────────────────────────────
// Production: thay mock bằng Supabase + RSSHub + RSS CORS proxy

function createArticle(fields: ArticleInput): Article {
  return {
    summary:       fields.summary       ?? null,
    content:       fields.content       ?? null,
    thumbnail_url: fields.thumbnail_url ?? null,
    author_id:     fields.author_id     ?? null,
    source_url:    fields.source_url    ?? null,
    source_meta:   fields.source_meta   ?? null,
    tags:          fields.tags          ?? [],
    category:      fields.category      ?? null,
    status:        fields.status        ?? 'published',
    id:            fields.id,
    title:         fields.title,
    slug:          fields.slug,
    source_type:   fields.source_type,
    created_at:    fields.created_at,
    published_at:  fields.published_at  ?? fields.created_at,
    updated_at:    fields.updated_at    ?? fields.created_at,
  }
}

async function parseRSSFeed(url: string, addLog: (t: LogEntry['type'], m: string) => void): Promise<Article[]> {
  addLog('info', `[RSS] Đang fetch: ${url}`)
  return new Promise((resolve) => {
    setTimeout(() => {
      const items = [
        {
          guid: 'rss-001', title: 'Khám phá Hội An: Phố cổ huyền bí dưới ánh đèn lồng',
          description: 'Hội An, viên ngọc quý của miền Trung Việt Nam, nổi tiếng với kiến trúc cổ kính và nền ẩm thực độc đáo.',
          enclosure: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80',
          link: 'https://dulich.vn/hoi-an-pho-co', pubDate: '2025-05-28T08:00:00Z',
          category: 'Miền Trung', tags: ['hội an', 'phố cổ', 'di sản'],
        },
        {
          guid: 'rss-002', title: 'Top 10 món ăn phải thử khi đến Đà Nẵng mùa hè này',
          description: 'Đà Nẵng không chỉ đẹp về cảnh quan mà còn quyến rũ bởi ẩm thực phong phú.',
          enclosure: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
          link: 'https://dulich.vn/mon-an-da-nang', pubDate: '2025-05-26T10:30:00Z',
          category: 'Ẩm thực', tags: ['đà nẵng', 'ẩm thực', 'mùa hè'],
        },
        {
          guid: 'rss-003', title: 'Cung đường ven biển Bình Định: Thiên đường cho người ưa phượt',
          description: 'Những cung đường dọc bờ biển Bình Định mang đến trải nghiệm tuyệt vời.',
          enclosure: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
          link: 'https://dulich.vn/binh-dinh-phuot', pubDate: '2025-05-24T14:00:00Z',
          category: 'Phượt', tags: ['bình định', 'phượt', 'biển'],
        },
      ]
      addLog('ok', `[RSS] Đã nhận ${items.length} item từ feed`)
      resolve(items.map((item) => createArticle({
        id: item.guid, title: item.title,
        slug: item.link.split('/').pop()!,
        summary: item.description, thumbnail_url: item.enclosure,
        source_type: 'rss', source_url: item.link,
        source_meta: { guid: item.guid, feed_url: url, raw_pubDate: item.pubDate },
        tags: item.tags, category: item.category, status: 'published',
        published_at: item.pubDate, created_at: item.pubDate,
      })))
    }, 600)
  })
}

async function parseTikTokFeed(username: string, addLog: (t: LogEntry['type'], m: string) => void): Promise<Article[]> {
  addLog('info', `[TikTok via RSSHub] Fetching @${username}`)
  return new Promise((resolve) => {
    setTimeout(() => {
      const items = [
        {
          guid: `tt-${username}-001`,
          caption: '🌊 Biển Phú Quốc 6am hoàng hôn siêu đẹp – không tin được là có thật 😮 #phuquoc #dulich',
          thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80',
          link: `https://www.tiktok.com/@${username}/video/1`, pubDate: '2025-05-27T06:12:00Z',
          hashtags: ['phuquoc', 'dulich'],
        },
        {
          guid: `tt-${username}-002`,
          caption: '🚗 Roadtrip Tây Bắc 7 ngày chỉ với 3 triệu – full chi phí chi tiết 📊 #taybac #phuot #travel',
          thumbnail: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80',
          link: `https://www.tiktok.com/@${username}/video/2`, pubDate: '2025-05-25T18:00:00Z',
          hashtags: ['taybac', 'phuot', 'travel'],
        },
        {
          guid: `tt-${username}-003`,
          caption: '🌿 Homestay giữa rừng Mộc Châu, check-in 500k/đêm bao view #mocchau #homestay',
          thumbnail: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=80',
          link: `https://www.tiktok.com/@${username}/video/3`, pubDate: '2025-05-23T09:30:00Z',
          hashtags: ['mocchau', 'homestay'],
        },
      ]
      addLog('ok', `[TikTok] Đã parse ${items.length} video từ @${username}`)
      resolve(items.map((item) => createArticle({
        id: item.guid, title: item.caption, slug: item.guid,
        summary: 'Video TikTok · Nhấn để xem trên TikTok',
        thumbnail_url: item.thumbnail, source_type: 'tiktok', source_url: item.link,
        source_meta: { tiktok_username: username, hashtags: item.hashtags, raw_caption: item.caption },
        tags: item.hashtags, category: 'Video', status: 'published',
        published_at: item.pubDate, created_at: item.pubDate,
      })))
    }, 900)
  })
}

function getManualArticles(): Article[] {
  return [
    createArticle({
      id: 'manual-001', title: 'Cẩm nang du lịch Đồng Tháp: Mùa sen nở rộ tháng 5',
      slug: 'cam-nang-du-lich-dong-thap-mua-sen',
      summary: 'Đồng Tháp mùa này ngập tràn sắc hồng của sen. Từ làng hoa Sa Đéc đến vườn quốc gia Tràm Chim.',
      thumbnail_url: 'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=400&q=80',
      author_id: 'user-staff-001', source_type: 'manual',
      tags: ['đồng tháp', 'mùa sen', 'miền tây'], category: 'Miền Tây',
      status: 'published', published_at: '2025-05-29T07:00:00Z', created_at: '2025-05-29T07:00:00Z',
    }),
    createArticle({
      id: 'manual-002', title: 'Lịch sự kiện du lịch tháng 6: Lễ hội & Tour giảm giá',
      slug: 'lich-su-kien-du-lich-thang-6',
      summary: 'Tháng 6 là cao điểm du lịch hè. Hàng loạt lễ hội và chương trình khuyến mãi được tổ chức toàn quốc.',
      thumbnail_url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80',
      author_id: 'user-staff-001', source_type: 'manual',
      tags: ['sự kiện', 'khuyến mãi', 'mùa hè'], category: 'Sự kiện',
      status: 'published', published_at: '2025-05-28T09:00:00Z', created_at: '2025-05-28T09:00:00Z',
    }),
    createArticle({
      id: 'manual-003', title: 'Hướng dẫn xin visa Nhật Bản 2025 mới nhất – từng bước chi tiết',
      slug: 'huong-dan-xin-visa-nhat-ban-2025',
      summary: 'Quy trình xin visa Nhật đã thay đổi từ tháng 3/2025. Bài viết cập nhật toàn bộ hồ sơ, lệ phí mới.',
      thumbnail_url: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=400&q=80',
      author_id: 'user-staff-002', source_type: 'manual',
      tags: ['visa', 'nhật bản', 'nước ngoài'], category: 'Nước ngoài',
      status: 'draft', published_at: null, created_at: '2025-05-30T10:00:00Z',
    }),
  ]
}

// ── Sub-components ────────────────────────────────────────────

function SourceBadge({ sourceType }: { sourceType: ArticleSourceType }) {
  const cfg = SOURCE_CONFIG[sourceType]
  const { Icon } = cfg
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.badgeClass}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

function ArticleCard({ article }: { article: Article }) {
  const [imgError, setImgError] = useState(false)
  const isExternal = article.source_type !== 'manual' && !!article.source_url
  const href = isExternal ? article.source_url! : '#'
  const tags = article.tags ?? []

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="group flex flex-col bg-white border border-black/10 rounded-xl overflow-hidden
                 hover:border-black/[0.22] hover:-translate-y-0.5 transition-all duration-200
                 dark:bg-neutral-900 dark:border-white/10 dark:hover:border-white/20"
      aria-label={article.title}
    >
      {/* Thumbnail */}
      <div className="relative w-full h-36 bg-gray-100 overflow-hidden flex-shrink-0 dark:bg-neutral-800">
        {article.thumbnail_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element -- article thumbnail from Supabase or RSS, dynamic domain; uses onError fallback
          <img
            src={article.thumbnail_url}
            alt={article.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl" aria-hidden>🏔️</div>
        )}
        <div className="absolute top-2 left-2">
          <SourceBadge sourceType={article.source_type} />
        </div>
        {article.status === 'draft' && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wide bg-amber-600/90 text-white">
            Draft
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {article.category && (
          <span className="self-start text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/[0.055] text-gray-600 dark:bg-white/[0.08] dark:text-gray-400">
            {article.category}
          </span>
        )}
        <p className="font-display text-sm font-medium text-gray-900 leading-snug line-clamp-2 dark:text-gray-100">
          {article.title}
        </p>
        {article.summary && (
          <p className="text-[11.5px] text-gray-500 leading-snug line-clamp-2 flex-1 dark:text-gray-400">
            {article.summary}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {tags.slice(0, 2).map((t) => (
              <span key={t} className="text-[10px] text-gray-400 bg-gray-50 border border-black/[0.08] px-1.5 py-0.5 rounded-full dark:bg-neutral-800 dark:border-white/[0.08]">
                #{t}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-black/[0.08] dark:border-white/[0.06]">
          <span className="flex items-center gap-1 text-[10.5px] text-gray-400">
            <Calendar size={11} />
            {new Date(article.published_at ?? article.created_at).toLocaleDateString('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </span>
          {isExternal && <ExternalLink size={13} className="text-gray-400" />}
        </div>
      </div>
    </a>
  )
}

function FeedLog({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) return null
  return (
    <div
      className="mt-6 p-3 bg-gray-50 border border-black/[0.08] rounded-xl
                 font-mono text-[11.5px] leading-7 max-h-24 overflow-y-auto
                 dark:bg-neutral-900 dark:border-white/[0.06]"
      role="log"
      aria-live="polite"
    >
      {entries.map((e, i) => (
        <div key={i} className="flex gap-3">
          <span className="text-gray-400 flex-shrink-0">{e.time}</span>
          <span className={e.type === 'ok' ? 'text-emerald-600' : e.type === 'err' ? 'text-red-500' : 'text-blue-500'}>
            {e.msg}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

type FilterKey = ArticleSourceType | 'all'

function ArticleFeedInner() {
  const [allArticles, setAllArticles]   = useState<Article[]>([])
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [isLoading, setIsLoading]       = useState(false)
  const [logs, setLogs]                 = useState<LogEntry[]>([])
  const [lastUpdated, setLastUpdated]   = useState<string>('')

  const addLog = useCallback((type: LogEntry['type'], msg: string) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogs((prev) => [...prev, { time, type, msg }])
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setLogs([])
    setActiveFilter('all')

    try {
      addLog('info', '[Aggregator] Bắt đầu tổng hợp tất cả nguồn...')
      const [rssItems, tiktokItems, manualItems] = await Promise.all([
        parseRSSFeed('https://namngantravel.com/feed.rss', addLog),
        parseTikTokFeed('namngantravel', addLog),
        Promise.resolve(getManualArticles()),
      ])
      const all = [...manualItems, ...rssItems, ...tiktokItems]
      const published = all.filter((a) => a.status === 'published')
      published.sort((a, b) =>
        new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime()
      )
      const draftCount = all.length - published.length
      if (draftCount > 0) addLog('info', `[Aggregator] Bỏ qua ${draftCount} bài draft/archived`)
      addLog('ok', `[Aggregator] Hoàn tất. Hiển thị ${published.length}/${all.length} bài viết.`)
      setAllArticles(published)
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'))
    } catch (err) {
      addLog('err', `Lỗi nghiêm trọng: ${err instanceof Error ? err.message : String(err)}`)
    }

    setIsLoading(false)
  }, [addLog])

  useEffect(() => { refresh() }, [refresh])

  const filtered = activeFilter === 'all'
    ? allArticles
    : allArticles.filter((a) => a.source_type === activeFilter)

  const counts: Partial<Record<FilterKey, number>> = { all: allArticles.length }
  allArticles.forEach((a) => { counts[a.source_type] = (counts[a.source_type] ?? 0) + 1 })

  const filterOptions: Array<{ key: FilterKey; label: string; dotColor: string }> = [
    { key: 'all', label: 'Tất cả', dotColor: '#888' },
    ...Object.entries(SOURCE_CONFIG).map(([k, v]) => ({
      key: k as ArticleSourceType,
      label: v.label,
      dotColor: v.dotColor,
    })),
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b border-black/[0.08] dark:border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight dark:text-gray-100">
            Du lịch Feed
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading
              ? 'Đang tải...'
              : lastUpdated
                ? `Tổng hợp từ nhiều nguồn · ${allArticles.length} bài viết · Cập nhật lúc ${lastUpdated}`
                : 'Tổng hợp từ nhiều nguồn'}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-black/[0.22]
                     bg-white text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-400
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     dark:bg-neutral-900 dark:border-white/[0.2] dark:text-gray-400 dark:hover:text-gray-200"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {filterOptions.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            aria-pressed={activeFilter === f.key}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                        border transition-colors
                        ${activeFilter === f.key
                          ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'
                          : 'bg-white text-gray-500 border-black/10 hover:border-black/22 hover:text-gray-900 dark:bg-neutral-900 dark:text-gray-400 dark:border-white/10'
                        }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: f.dotColor }}
              aria-hidden
            />
            {f.label}
            <span className="opacity-55">({counts[f.key] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {allArticles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(counts)
            .filter(([k]) => k !== 'all' && (counts[k as FilterKey] ?? 0) > 0)
            .map(([k, v]) => (
              <div
                key={k}
                className="px-3 py-1 bg-gray-50 border border-black/[0.08] rounded text-xs text-gray-500
                           dark:bg-neutral-800 dark:border-white/[0.06] dark:text-gray-400"
              >
                <strong className="text-gray-800 font-medium dark:text-gray-200">{v}</strong>{' '}
                từ {SOURCE_CONFIG[k as ArticleSourceType]?.label ?? k}
              </div>
            ))}
        </div>
      )}

      {/* Card grid */}
      {filtered.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Inbox size={36} className="mb-3 opacity-40" />
          <p className="text-sm">Không có bài viết nào phù hợp với bộ lọc này.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Feed log */}
      <FeedLog entries={logs} />
    </div>
  )
}

export default function ArticleFeed() {
  return (
    <ErrorBoundary moduleName="ArticleFeed">
      <ArticleFeedInner />
    </ErrorBoundary>
  )
}
