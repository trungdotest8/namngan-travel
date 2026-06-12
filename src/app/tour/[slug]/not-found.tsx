import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { MapPin } from 'lucide-react'

export default function TourNotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#F0F7FF] flex items-center justify-center mx-auto">
            <MapPin size={28} className="text-[#005BAA]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">Tour không tìm thấy</h1>
            <p className="text-[#666666] text-sm leading-relaxed">
              Tour này có thể đã hết hạn, ngừng hoạt động hoặc đường dẫn không chính xác.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link
              href="/lich-khoi-hanh"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#005BAA] text-white font-semibold text-sm rounded-xl hover:bg-[#0078D7] transition-colors"
            >
              Xem lịch khởi hành
            </Link>
            <Link
              href="/tours"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 border-2 border-[#005BAA] text-[#005BAA] font-semibold text-sm rounded-xl hover:bg-[#F0F7FF] transition-colors"
            >
              Tất cả tour
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
