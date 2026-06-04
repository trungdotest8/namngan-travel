'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Tag, ChevronRight, Newspaper, Loader2 } from 'lucide-react'
import type { ArticleListItem } from '@/lib/directus'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6

const CATEGORY_TABS = [
  { key: '',        label: 'Tất cả'   },
  { key: 'du-lich', label: 'Du lịch'  },
  { key: 'am-thuc', label: 'Ẩm thực' },
  { key: 'van-hoa', label: 'Văn hóa' },
  { key: 'meo-hay', label: 'Mẹo hay' },
]

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── Article Card ──────────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <Link
      href={`/tin-tuc/${article.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {article.thumbnail_url ? (
          <Image
            src={article.thumbnail_url}
            alt={article.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#F0F7FF] to-[#D0E8FF]">
            <Newspaper size={32} className="text-[#005BAA] opacity-40" />
          </div>
        )}
        {article.category && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-[#005BAA] text-white text-xs font-semibold rounded-lg">
            {article.category}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-[#1A1A2E] text-sm leading-snug line-clamp-2 group-hover:text-[#005BAA] transition-colors">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-xs text-[#666666] line-clamp-2 leading-relaxed">{article.summary}</p>
        )}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {article.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs text-[#005BAA] bg-[#F0F7FF] px-2 py-0.5 rounded-md"
              >
                <Tag size={10} />{tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          {article.published_at ? (
            <span className="flex items-center gap-1 text-xs text-[#666666]">
              <Calendar size={11} />{formatDate(article.published_at)}
            </span>
          ) : <span />}
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#005BAA]">
            Đọc thêm<ChevronRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function NewsPagination({
  currentPage, totalPages, onPageChange,
}: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-12 py-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-[#F0F7FF] disabled:opacity-40 disabled:hover:bg-white transition-colors"
      >
        Trước
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
        <button
          key={num}
          onClick={() => onPageChange(num)}
          className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-semibold transition-all ${
            num === currentPage
              ? 'bg-[#005BAA] text-white shadow-md shadow-blue-100'
              : 'border border-gray-300 text-gray-700 bg-white hover:bg-[#F0F7FF] hover:border-[#0078D7]'
          }`}
        >
          {num}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-[#F0F7FF] disabled:opacity-40 disabled:hover:bg-white transition-colors"
      >
        Sau
      </button>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ category }: { category: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-[#F0F7FF] flex items-center justify-center mb-5">
        <Newspaper size={36} className="text-[#005BAA] opacity-60" />
      </div>
      <h2 className="text-lg font-semibold text-[#1A1A2E] mb-2">
        {category ? `Chưa có bài viết về "${category}"` : 'Chưa có bài viết nào'}
      </h2>
      <p className="text-sm text-[#666666] max-w-sm">Bài viết đang được biên tập. Quay lại sau nhé!</p>
    </div>
  )
}

// ── Main Client Component ─────────────────────────────────────────────────────

interface PaginationMeta {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export default function TinTucClient({ activeCategory }: { activeCategory: string }) {
  const [articles, setArticles]     = useState<ArticleListItem[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const fetchPage = useCallback(async (page: number, category: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status: 'published',
      })
      if (category) params.set('category', category)
      const res = await fetch(`/api/cms?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setArticles(json.articles ?? [])
      setPagination(json.pagination ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải bài viết')
    } finally {
      setLoading(false)
    }
  }, [])

  // Reset to page 1 when category changes
  useEffect(() => {
    setCurrentPage(1)
    fetchPage(1, activeCategory)
  }, [activeCategory, fetchPage])

  function handlePageChange(page: number) {
    setCurrentPage(page)
    fetchPage(page, activeCategory)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORY_TABS.map(tab => (
          <Link
            key={tab.key}
            href={tab.key ? `/tin-tuc?category=${tab.key}` : '/tin-tuc'}
            className={`px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
              activeCategory === tab.key
                ? 'bg-[#005BAA] text-white border-[#005BAA]'
                : 'bg-white text-[#1A1A2E] border-gray-200 hover:border-[#005BAA] hover:text-[#005BAA]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Đang tải...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center justify-center py-20 text-red-500 text-sm">
          Không thể tải bài viết. Vui lòng thử lại.
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {pagination && pagination.totalItems > 0 && (
            <p className="text-sm text-[#666666] mb-6">
              <span className="font-semibold text-[#1A1A2E]">{pagination.totalItems}</span> bài viết
              {activeCategory ? ` trong "${activeCategory}"` : ''}
              {pagination.totalPages > 1 && (
                <span className="text-gray-400 ml-1">
                  — trang {currentPage}/{pagination.totalPages}
                </span>
              )}
            </p>
          )}

          {articles.length === 0 ? (
            <EmptyState category={activeCategory} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

          {pagination && (
            <NewsPagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </>
  )
}
