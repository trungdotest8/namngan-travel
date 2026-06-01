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
  if (!url || !token) {
    throw new Error(
      'Directus chưa được cấu hình. Thêm DIRECTUS_URL và DIRECTUS_STATIC_TOKEN vào .env.local'
    )
  }
  return createDirectus(url).with(staticToken(token)).with(rest())
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
  try {
    const client = getClient()

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
    return []
  }
}

// ── fetchArticleBySlug ────────────────────────────────────────────────────────

/**
 * Tìm bài viết theo slug — dùng cho route /tin-tuc/[slug].
 * Trả null khi không tìm thấy hoặc lỗi.
 */
export async function fetchArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  try {
    const client = getClient()

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
    return null
  }
}

// ── fetchArticleById ──────────────────────────────────────────────────────────

/**
 * Lấy toàn bộ chi tiết bài viết theo UUID — dùng khi có id trực tiếp.
 * Trả null khi không tìm thấy hoặc lỗi.
 */
export async function fetchArticleById(id: string): Promise<ArticleDetail | null> {
  try {
    const client = getClient()

    const item = await client.request(
      readItem('articles', id, {
        fields: [...DETAIL_FIELDS],
      })
    )

    return item ? (item as ArticleDetail) : null
  } catch (err) {
    console.error('[directus] fetchArticleById error:', err instanceof Error ? err.message : err)
    return null
  }
}
