import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, Tag, ChevronRight, Newspaper } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { fetchArticles, type ArticleListItem } from '@/lib/directus'

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata = {
  title:       'Tin Tức Du Lịch — Nam Ngân Travel',
  description: 'Cập nhật tin tức du lịch, kinh nghiệm khám phá, văn hóa ẩm thực và các ưu đãi mới nhất từ Nam Ngân Travel.',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: { category?: string }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_TABS = [
  { key: '',        label: 'Tất cả'    },
  { key: 'du-lich', label: 'Du lịch'   },
  { key: 'am-thuc', label: 'Ẩm thực'  },
  { key: 'van-hoa', label: 'Văn hóa'  },
  { key: 'meo-hay', label: 'Mẹo hay'  },
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
      {/* Thumbnail */}
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

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-[#1A1A2E] text-sm leading-snug line-clamp-2 group-hover:text-[#005BAA] transition-colors">
          {article.title}
        </h3>

        {article.summary && (
          <p className="text-xs text-[#666666] line-clamp-2 leading-relaxed">
            {article.summary}
          </p>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {article.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs text-[#005BAA] bg-[#F0F7FF] px-2 py-0.5 rounded-md"
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Date + CTA */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          {article.published_at ? (
            <span className="flex items-center gap-1 text-xs text-[#666666]">
              <Calendar size={11} />
              {formatDate(article.published_at)}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#005BAA]">
            Đọc thêm
            <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </Link>
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
      <p className="text-sm text-[#666666] max-w-sm">
        Bài viết đang được biên tập. Quay lại sau nhé!
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TinTucPage({ searchParams }: Props) {
  const activeCategory = searchParams.category ?? ''

  const articles = await fetchArticles({
    limit:    48,
    category: activeCategory || undefined,
  })

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#003d80] via-[#005BAA] to-[#0078D7] text-white pt-12 pb-0 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-blue-200 text-sm mb-4">
              <Link href="/" className="hover:text-white transition-colors">Trang chủ</Link>
              <span>/</span>
              <span className="text-white">Tin tức</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Tin Tức Du Lịch</h1>
            <p className="text-blue-100 text-base max-w-lg">
              Kinh nghiệm du lịch, khám phá điểm đến mới, ẩm thực và văn hóa từ khắp nơi trên thế giới.
            </p>
          </div>
          <div className="h-6 bg-[#F8FAFC] rounded-t-[2rem] mt-8" />
        </section>

        <section className="max-w-6xl mx-auto px-4 py-8">
          {/* Category tabs — flex-wrap, no scroll */}
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

          {/* Result count */}
          {articles.length > 0 && (
            <p className="text-sm text-[#666666] mb-6">
              <span className="font-semibold text-[#1A1A2E]">{articles.length}</span> bài viết
              {activeCategory ? ` trong "${activeCategory}"` : ''}
            </p>
          )}

          {/* Grid */}
          {articles.length === 0 ? (
            <EmptyState category={activeCategory} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
