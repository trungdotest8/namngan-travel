import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { TaoLichTrinhClient } from '@/components/home/TaoLichTrinhClient'

export const metadata: Metadata = {
  title:       'Tạo Lịch Trình Du Lịch Miễn Phí — TripGenie | Nam Ngân Travel',
  description: 'Tạo lịch trình du lịch cá nhân hóa hoàn toàn miễn phí. Cho biết điểm đến và ngân sách — TripGenie tư vấn lịch trình trong 30 phút qua Zalo.',
  openGraph: {
    title:       'Tạo Lịch Trình Du Lịch Miễn Phí — TripGenie',
    description: 'AI tư vấn lịch trình du lịch cá nhân hóa trong 30 phút, hoàn toàn miễn phí.',
    images:      [{ url: '/og-default.jpg', width: 1200, height: 630 }],
    type:        'website',
  },
  alternates: { canonical: 'https://namngantravel.com/tao-lich-trinh' },
}

export default function TaoLichTrinhPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />
      <TaoLichTrinhClient />
      <Footer />
    </div>
  )
}
