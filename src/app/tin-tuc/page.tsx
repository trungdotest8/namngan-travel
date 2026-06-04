import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import TinTucClient from './TinTucClient'

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata = {
  title:       'Tin Tức Du Lịch — Nam Ngân Travel',
  description: 'Cập nhật tin tức du lịch, kinh nghiệm khám phá, văn hóa ẩm thực và các ưu đãi mới nhất từ Nam Ngân Travel.',
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: { category?: string }
}

export default async function TinTucPage({ searchParams }: Props) {
  const activeCategory = searchParams.category ?? ''

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
          <TinTucClient activeCategory={activeCategory} />
        </section>
      </main>

      <Footer />
    </div>
  )
}
