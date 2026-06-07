import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { BlogListClient } from '@/components/blog/BlogListClient'
import { fetchArticles } from '@/lib/directus'

export const metadata: Metadata = {
  title:       'Blog Du Lịch — Kinh Nghiệm, Review Điểm Đến | Nam Ngân Travel',
  description: 'Cẩm nang du lịch, review điểm đến trong nước và quốc tế, bí kíp tiết kiệm và hướng dẫn xin visa từ Nam Ngân Travel.',
  openGraph: {
    title:       'Blog Du Lịch Nam Ngân Travel',
    description: 'Kinh nghiệm du lịch, review điểm đến, cẩm nang visa và bí kíp tiết kiệm.',
    images:      [{ url: '/og-default.jpg', width: 1200, height: 630 }],
    type:        'website',
  },
  alternates: { canonical: 'https://namngantravel.com/blog' },
}

export default async function BlogPage() {
  const articles = await fetchArticles({ limit: 100 }).catch(() => [])

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />
      <main className="flex-1">
        <BlogListClient initialArticles={articles} />
      </main>
      <Footer />
    </div>
  )
}
