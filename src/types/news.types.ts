// Bảng articles — CMS + RSS/TikTok/Facebook crawler
export type ArticleSourceType = 'manual' | 'rss' | 'tiktok' | 'facebook'
export type ArticleStatus     = 'draft' | 'published' | 'archived'

export interface Article {
  id:            string
  title:         string
  slug:          string
  summary:       string | null
  content:       string | null
  thumbnail_url: string | null
  author_id:     string | null
  source_type:   ArticleSourceType
  source_url:    string | null
  source_meta:   Record<string, unknown> | null   // JSONB metadata từ nguồn
  tags:          string[] | null
  category:      string | null
  status:        ArticleStatus
  published_at:  string | null
  created_at:    string
  updated_at:    string
}

// Giữ alias cũ để không break code đang dùng NewsArticle/FeedItem
export type NewsArticle = Article

export interface FeedItem {
  title:        string
  url:          string
  thumbnail?:   string
  source:       string
  published_at: string
}
