/**
 * Directus CMS — Nam Ngân Travel
 *
 * Kiến trúc: Directus self-hosted (cms.namngantravel.com) kết nối tới
 * cùng PostgreSQL database của Supabase — không cần migration thêm.
 *
 * Cấu hình Directus server (.env của Directus):
 *   DB_CLIENT=pg
 *   DB_CONNECTION_STRING=postgresql://postgres:[password]@db.indjoegnsvcteaozmgrg.supabase.co:5432/postgres
 *   (Lấy từ: Supabase Dashboard → Settings → Database → Connection string → URI mode)
 *
 * Cấu hình Data Model trong Directus Admin UI:
 *   Settings → Data Model → articles
 *   - field "content"       → interface: WYSIWYG  (lưu HTML vào cột TEXT hiện có)
 *   - field "thumbnail_url" → interface: Input (URL) hoặc Image trỏ Supabase Storage
 *   - field "status"        → interface: Dropdown  (draft | published | archived)
 *
 * Tạo Static Token (read-only cho frontend):
 *   Directus Admin → Settings → API Access Tokens → New Token
 *   → Permissions: read-only trên collection "articles"
 *   → Copy token → DIRECTUS_STATIC_TOKEN trong .env.local
 */

import {
  createDirectus,
  rest,
  staticToken,
  readItems,
  readItem,
} from '@directus/sdk'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Lightweight — dùng cho trang listing (grid bài viết) */
export interface ArticleListItem {
  id:            string
  title:         string
  slug:          string
  summary:       string | null
  thumbnail_url: string | null
  category:      string | null
  tags:          string[] | null
  published_at:  string | null
}

/** Full article — dùng cho trang chi tiết */
export interface ArticleDetail extends ArticleListItem {
  content:     string | null   // HTML từ WYSIWYG editor
  source_type: string | null
  author_id:   string | null
}

// ── Client factory ────────────────────────────────────────────────────────────
// Tạo mới mỗi request — không singleton — tránh token leak trên Edge runtime

function getClient() {
  const url   = process.env.DIRECTUS_URL
  const token = process.env.DIRECTUS_STATIC_TOKEN
  if (!url || !token) return null
  return createDirectus(url).with(staticToken(token)).with(rest())
}

// ── Supabase fallback (khi Directus chưa setup) ───────────────────────────────

const SB_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL   ?? ''
const SB_ANON  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function sbFetchArticles(options?: {
  limit?:    number
  category?: string
}): Promise<ArticleListItem[]> {
  if (!SB_URL || !SB_ANON) return []
  const limit = options?.limit ?? 50
  let endpoint = `${SB_URL}/rest/v1/articles?status=eq.published&order=published_at.desc&limit=${limit}`
  if (options?.category) endpoint += `&category=eq.${encodeURIComponent(options.category)}`
  endpoint += '&select=id,title,slug,summary,thumbnail_url,category,tags,published_at'
  const res = await fetch(endpoint, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    next:    { revalidate: 300 },
  })
  if (!res.ok) return []
  return res.json() as Promise<ArticleListItem[]>
}

async function sbFetchArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  if (!SB_URL || !SB_ANON) return null
  const endpoint = `${SB_URL}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`
    + '&select=id,title,slug,summary,thumbnail_url,category,tags,published_at,content,source_type,author_id'
  const res = await fetch(endpoint, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    next:    { revalidate: 300 },
  })
  if (!res.ok) return null
  const rows = await res.json() as ArticleDetail[]
  return rows[0] ?? null
}

async function sbFetchArticleById(id: string): Promise<ArticleDetail | null> {
  if (!SB_URL || !SB_ANON) return null
  const endpoint = `${SB_URL}/rest/v1/articles?id=eq.${id}&limit=1`
    + '&select=id,title,slug,summary,thumbnail_url,category,tags,published_at,content,source_type,author_id'
  const res = await fetch(endpoint, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    next:    { revalidate: 300 },
  })
  if (!res.ok) return null
  const rows = await res.json() as ArticleDetail[]
  return rows[0] ?? null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LIST_FIELDS = [
  'id', 'title', 'slug', 'summary',
  'thumbnail_url', 'category', 'tags', 'published_at',
] as const

const DETAIL_FIELDS = [
  ...LIST_FIELDS,
  'content', 'source_type', 'author_id',
] as const

// ── fetchArticles ─────────────────────────────────────────────────────────────

/**
 * Lấy danh sách bài viết đã xuất bản — dùng cho trang /tin-tuc (grid).
 * Chỉ lấy các trường nhẹ cần thiết để render card.
 * Trả [] khi lỗi (Directus chưa setup hoặc offline) — không throw.
 */
export async function fetchArticles(options?: {
  limit?:    number
  category?: string
  tag?:      string
}): Promise<ArticleListItem[]> {
  const client = getClient()
  if (!client) return sbFetchArticles(options)

  try {
    const filter: Record<string, unknown> = {
      status: { _eq: 'published' },
    }
    if (options?.category) filter.category = { _eq: options.category }
    if (options?.tag)      filter.tags      = { _contains: options.tag }

    const items = await client.request(
      readItems('articles', {
        fields: [...LIST_FIELDS],
        filter,
        sort:  ['-published_at'],
        limit: options?.limit ?? 50,
      })
    )

    return (items ?? []) as ArticleListItem[]
  } catch (err) {
    console.error('[directus] fetchArticles error:', err instanceof Error ? err.message : err)
    return sbFetchArticles(options)
  }
}

// ── fetchArticleBySlug ────────────────────────────────────────────────────────

/**
 * Tìm bài viết theo slug — dùng cho route /tin-tuc/[slug].
 * Trả null khi không tìm thấy hoặc lỗi.
 */
export async function fetchArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const client = getClient()
  if (!client) return sbFetchArticleBySlug(slug)

  try {
    const items = await client.request(
      readItems('articles', {
        fields: [...DETAIL_FIELDS],
        filter: {
          slug:   { _eq: slug },
          status: { _eq: 'published' },
        },
        limit: 1,
      })
    )

    const item = (items ?? [])[0]
    return item ? (item as ArticleDetail) : null
  } catch (err) {
    console.error('[directus] fetchArticleBySlug error:', err instanceof Error ? err.message : err)
    return sbFetchArticleBySlug(slug)
  }
}

// ── fetchArticleById ──────────────────────────────────────────────────────────

/**
 * Lấy toàn bộ chi tiết bài viết theo UUID — dùng khi có id trực tiếp.
 * Trả null khi không tìm thấy hoặc lỗi.
 */
export async function fetchArticleById(id: string): Promise<ArticleDetail | null> {
  const client = getClient()
  if (!client) return sbFetchArticleById(id)

  try {
    const item = await client.request(
      readItem('articles', id, {
        fields: [...DETAIL_FIELDS],
      })
    )

    return item ? (item as ArticleDetail) : null
  } catch (err) {
    console.error('[directus] fetchArticleById error:', err instanceof Error ? err.message : err)
    return sbFetchArticleById(id)
  }
}
