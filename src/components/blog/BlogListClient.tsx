'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { BlogCard } from '@/components/blog/BlogCard'
import { Pagination } from '@/components/ui/Pagination'
import type { ArticleListItem } from '@/lib/directus'

const PAGE_SIZE = 9

function estimateReadingTime(summary: string | null): number {
  const words = (summary ?? '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil((words * 5) / 200))
}

interface Props {
  initialArticles: ArticleListItem[]
}

export function BlogListClient({ initialArticles }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch]           = useState('')
  const [activeCategory, setCategory] = useState('')

  const categories = Array.from(
    new Set(initialArticles.map(a => a.category).filter(Boolean))
  ) as string[]

  const filtered = initialArticles.filter(a => {
    const matchCat    = !activeCategory || a.category === activeCategory
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged      = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleCategoryChange = (cat: string) => { setCategory(cat); setCurrentPage(1) }
  const handleSearch         = (val: string) =>  { setSearch(val);   setCurrentPage(1) }

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#003d80] via-[#005BAA] to-[#0078D7] text-white pt-12 pb-0 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-blue-200 text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">Trang chủ</Link>
            <span>/</span>
            <span className="text-white">Blog</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Blog Du Lịch</h1>
          <p className="text-blue-100 text-base max-w-lg">
            Kinh nghiệm du lịch, review điểm đến, bí kíp tiết kiệm và cẩm nang xin visa từ Nam Ngân Travel.
          </p>

          {/* Search bar */}
          <div className="relative mt-5 max-w-md">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full bg-white/15 backdrop-blur-sm border border-white/25 rounded-full py-2.5 pl-10 pr-4 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              aria-label="Tìm kiếm bài viết"
            />
          </div>
        </div>
        <div className="h-6 bg-[#F8FAFC] rounded-t-[2rem] mt-8" />
      </section>

      {/* ── Category + Grid ── */}
      <section className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => handleCategoryChange('')}
              className={[
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                activeCategory === ''
                  ? 'bg-[#005BAA] text-white'
                  : 'bg-white border border-gray-200 text-[#666666] hover:border-[#005BAA] hover:text-[#005BAA]',
              ].join(' ')}
            >
              Tất cả
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={[
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                  activeCategory === cat
                    ? 'bg-[#005BAA] text-white'
                    : 'bg-white border border-gray-200 text-[#666666] hover:border-[#005BAA] hover:text-[#005BAA]',
                ].join(' ')}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Articles grid */}
        {paged.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {paged.map(article => (
              <BlogCard
                key={article.id}
                title={article.title}
                slug={article.slug}
                summary={article.summary}
                thumbnail_url={article.thumbnail_url}
                category={article.category}
                tags={article.tags}
                published_at={article.published_at}
                reading_time={estimateReadingTime(article.summary)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-[#666666]">
            {search
              ? `Không tìm thấy bài viết cho "${search}"`
              : 'Chưa có bài viết nào.'}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </section>
    </>
  )
}
