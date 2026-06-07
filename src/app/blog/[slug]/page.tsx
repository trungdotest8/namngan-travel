import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, Tag, ArrowLeft, Clock, Sparkles } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { TripGenieLeadModal } from '@/components/booking/TripGenieLeadModal'
import { fetchArticleBySlug } from '@/lib/directus'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  params: { slug: string }
}

// ── Metadata (dynamic) ────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props) {
  const article = await fetchArticleBySlug(params.slug)
  if (!article) return { title: 'Bài viết không tìm thấy — Nam Ngân Travel' }
  return {
    title:       `${article.title} | Blog Nam Ngân Travel`,
    description: article.summary ?? undefined,
    openGraph: {
      title:       article.title,
      description: article.summary ?? undefined,
      type:        'article',
      images:      article.thumbnail_url ? [article.thumbnail_url] : [],
      publishedTime: article.published_at ?? undefined,
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function estimateReadingTime(content: string | null): number {
  const words = (content ?? '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

// ── CTA wrapper — client component needed for modal state ─────────────────────

import BlogCtaSection from './BlogCtaSection'

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BlogDetailPage({ params }: Props) {
  const article = await fetchArticleBySlug(params.slug)
  if (!article) notFound()

  const readTime = estimateReadingTime(article.content)

  // JSON-LD Article schema
  const articleSchema = {
    '@context':       'https://schema.org',
    '@type':          'Article',
    headline:         article.title,
    description:      article.summary ?? undefined,
    image:            article.thumbnail_url ?? undefined,
    author: {
      '@type': 'Organization',
      name:    'Nam Ngân Travel',
    },
    publisher: {
      '@type': 'Organization',
      name:    'Nam Ngân Travel',
      logo: {
        '@type': 'ImageObject',
        url:     'https://namngantravel.com/logo.png',
      },
    },
    datePublished: article.published_at ?? undefined,
    url:           `https://namngantravel.com/blog/${article.slug}`,
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <Header />

      <main className="flex-1">
        {/* Hero thumbnail */}
        {article.thumbnail_url && (
          <div className="relative w-full h-64 md:h-96 overflow-hidden bg-gray-100">
            <Image
              src={article.thumbnail_url}
              alt={article.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#666666] mb-6 flex-wrap">
            <Link href="/" className="hover:text-[#005BAA] transition-colors">Trang chủ</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[#005BAA] transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-[#1A1A2E] line-clamp-1">{article.title}</span>
          </div>

          {/* Header */}
          <header className="mb-8">
            {article.category && (
              <span className="inline-block px-3 py-1 bg-[#005BAA] text-white text-xs font-semibold rounded-lg mb-3">
                {article.category}
              </span>
            )}

            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] leading-tight mb-4">
              {article.title}
            </h1>

            {article.summary && (
              <p className="text-[#666666] text-base leading-relaxed border-l-4 border-[#005BAA] pl-4 mb-4">
                {article.summary}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-[#666666]">
              {article.published_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#005BAA]" />
                  {formatDate(article.published_at)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#005BAA]" />
                {readTime} phút đọc
              </span>
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.map(tag => (
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
            </div>
          </header>

          {/* Body */}
          {article.content ? (
            <article
              className={[
                'prose prose-sm sm:prose max-w-none',
                'prose-headings:text-[#1A1A2E] prose-headings:font-bold',
                'prose-a:text-[#005BAA] prose-a:no-underline hover:prose-a:underline',
                'prose-img:rounded-xl prose-img:shadow-sm',
                'prose-blockquote:border-l-[#005BAA] prose-blockquote:text-[#666666]',
                'prose-strong:text-[#1A1A2E]',
              ].join(' ')}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : (
            <p className="text-[#666666] italic py-8 text-center">Nội dung đang được cập nhật...</p>
          )}

          <div className="h-px bg-gray-200 my-10" />

          {/* Back + CTA (client component for modal) */}
          <BlogCtaSection />

          <div className="mt-4 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#005BAA] hover:text-[#0078D7] transition-colors"
            >
              <ArrowLeft size={16} />
              Quay lại Blog
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
