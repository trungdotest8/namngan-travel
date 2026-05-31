import Link from 'next/link'
import Image from 'next/image'
import { Clock, MapPin, Star, Shield, Users, Award, HeadphonesIcon, ChevronRight, Phone } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import TourSearchBar from '@/components/search/TourSearchBar'
import SearchResults from '@/components/search/SearchResults'
import ChatWidget from '@/components/chat/ChatWidget'
import AutoPopup from '@/components/chat/AutoPopup'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// ── Mock tour data ────────────────────────────────────────────

const INTL_TOURS = [
  {
    id: '1', slug: 'trung-quoc-bac-kinh-van-ly-truong-thanh',
    name: 'Bắc Kinh – Vạn Lý Trường Thành – Tử Cấm Thành 6N5Đ',
    destination: 'Trung Quốc', duration_days: 6, category: 'nước ngoài',
    thumbnail_url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&q=80',
    min_price: 12900000,
  },
  {
    id: '2', slug: 'nhat-ban-tokyo-osaka-kyoto',
    name: 'Tokyo – Osaka – Kyoto – Nara 7N6Đ',
    destination: 'Nhật Bản', duration_days: 7, category: 'nước ngoài',
    thumbnail_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80',
    min_price: 28900000,
  },
  {
    id: '3', slug: 'han-quoc-seoul-jeju',
    name: 'Seoul – Busan – Đảo Jeju 6N5Đ',
    destination: 'Hàn Quốc', duration_days: 6, category: 'nước ngoài',
    thumbnail_url: 'https://images.unsplash.com/photo-1538485399081-7c8272e29df8?w=600&q=80',
    min_price: 18900000,
  },
  {
    id: '4', slug: 'thai-lan-bangkok-pattaya',
    name: 'Bangkok – Pattaya – Phuket 5N4Đ',
    destination: 'Thái Lan', duration_days: 5, category: 'nước ngoài',
    thumbnail_url: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&q=80',
    min_price: 10900000,
  },
  {
    id: '5', slug: 'dai-loan-dai-bac-cao-hung',
    name: 'Đài Bắc – Đài Trung – Cao Hùng 5N4Đ',
    destination: 'Đài Loan', duration_days: 5, category: 'nước ngoài',
    thumbnail_url: 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=600&q=80',
    min_price: 15900000,
  },
  {
    id: '6', slug: 'singapore-sentosa',
    name: 'Singapore – Gardens by the Bay – Sentosa 4N3Đ',
    destination: 'Singapore', duration_days: 4, category: 'nước ngoài',
    thumbnail_url: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80',
    min_price: 13900000,
  },
  {
    id: '7', slug: 'phap-paris-nice',
    name: 'Paris – Nice – Lyon – Bordeaux 9N8Đ',
    destination: 'Pháp', duration_days: 9, category: 'nước ngoài',
    thumbnail_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80',
    min_price: 55900000,
  },
  {
    id: '8', slug: 'y-rome-venice-milan',
    name: 'Rome – Florence – Venice – Milan 10N9Đ',
    destination: 'Ý', duration_days: 10, category: 'nước ngoài',
    thumbnail_url: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=600&q=80',
    min_price: 62900000,
  },
]

const DOMESTIC_TOURS = [
  {
    id: '9', slug: 'ha-giang-dong-van',
    name: 'Hà Giang – Đồng Văn – Mèo Vạc 4N3Đ',
    destination: 'Hà Giang', duration_days: 4, category: 'trong nước',
    thumbnail_url: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=600&q=80',
    min_price: 3900000,
  },
  {
    id: '10', slug: 'phu-quoc-toan-dao',
    name: 'Phú Quốc Toàn Đảo – Bắc & Nam 4N3Đ',
    destination: 'Phú Quốc', duration_days: 4, category: 'trong nước',
    thumbnail_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80',
    min_price: 4500000,
  },
  {
    id: '11', slug: 'da-nang-hoi-an-ba-na',
    name: 'Đà Nẵng – Hội An – Bà Nà Hills 4N3Đ',
    destination: 'Đà Nẵng', duration_days: 4, category: 'trong nước',
    thumbnail_url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&q=80',
    min_price: 3200000,
  },
  {
    id: '12', slug: 'sapa-fansipan',
    name: 'Sapa – Fansipan – Bản Cát Cát 3N2Đ',
    destination: 'Sapa', duration_days: 3, category: 'trong nước',
    thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    min_price: 2900000,
  },
  {
    id: '13', slug: 'ha-long-du-thuyen',
    name: 'Hạ Long – Du Thuyền Cao Cấp 3N2Đ',
    destination: 'Hạ Long', duration_days: 3, category: 'trong nước',
    thumbnail_url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80',
    min_price: 5900000,
  },
  {
    id: '14', slug: 'da-lat-mua-hoa',
    name: 'Đà Lạt – Thung Lũng Tình Yêu – Valley 3N2Đ',
    destination: 'Đà Lạt', duration_days: 3, category: 'trong nước',
    thumbnail_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80',
    min_price: 2200000,
  },
  {
    id: '15', slug: 'nha-trang-4-dao',
    name: 'Nha Trang – Khám Phá 4 Đảo 3N2Đ',
    destination: 'Nha Trang', duration_days: 3, category: 'trong nước',
    thumbnail_url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80',
    min_price: 2500000,
  },
  {
    id: '16', slug: 'mu-cang-chai-mua-vang',
    name: 'Mù Cang Chải – Mùa Vàng Ruộng Bậc Thang 3N2Đ',
    destination: 'Mù Cang Chải', duration_days: 3, category: 'trong nước',
    thumbnail_url: 'https://images.unsplash.com/photo-1473655736600-2f2c9b735c40?w=600&q=80',
    min_price: 3100000,
  },
]

const HERO_SLIDES = [
  {
    title: 'Hà Giang – Shangrila',
    subtitle: 'Vẻ đẹp hùng vĩ nơi địa đầu Tổ quốc',
    image: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=1600&q=85',
    cta: 'Khám phá ngay',
    href: '/tours?destination=ha-giang',
  },
]

const WHY_US = [
  {
    icon: Shield,
    title: 'Uy tín 10+ năm',
    desc: 'Hơn 10 năm kinh nghiệm, phục vụ hàng chục nghìn khách hàng tin tưởng.',
  },
  {
    icon: Award,
    title: 'Tour chất lượng cao',
    desc: 'Được kiểm duyệt kỹ lưỡng, đảm bảo trải nghiệm tốt nhất cho du khách.',
  },
  {
    icon: Users,
    title: 'Đội ngũ chuyên nghiệp',
    desc: 'Hướng dẫn viên giàu kinh nghiệm, nhiệt tình, am hiểu từng điểm đến.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Hỗ trợ 24/7',
    desc: 'Luôn sẵn sàng hỗ trợ trước, trong và sau chuyến đi.',
  },
]

const POPULAR_DEST = [
  { name: 'Trung Quốc', image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&q=80', href: '/tours?destination=trung-quoc', count: 24 },
  { name: 'Nhật Bản', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80', href: '/tours?destination=nhat-ban', count: 18 },
  { name: 'Hàn Quốc', image: 'https://images.unsplash.com/photo-1538485399081-7c8272e29df8?w=400&q=80', href: '/tours?destination=han-quoc', count: 15 },
  { name: 'Phú Quốc', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', href: '/tours?destination=phu-quoc', count: 12 },
  { name: 'Đà Nẵng', image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80', href: '/tours?destination=da-nang', count: 20 },
  { name: 'Hà Giang', image: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=400&q=80', href: '/tours?destination=ha-giang', count: 10 },
]

function formatPrice(vnd: number) {
  return new Intl.NumberFormat('vi-VN').format(vnd) + 'đ'
}

// ── Tour Card Static ──────────────────────────────────────────
function TourCardStatic({ tour }: {
  tour: typeof INTL_TOURS[0]
}) {
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all duration-200"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-bg">
        <Image
          src={tour.thumbnail_url}
          alt={tour.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`px-2 py-0.5 text-white text-[10px] font-semibold rounded-full ${
            tour.category === 'nước ngoài' ? 'bg-brand-blue' : 'bg-emerald-600'
          }`}>
            {tour.category === 'nước ngoài' ? 'Quốc tế' : 'Trong nước'}
          </span>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Star size={9} fill="currentColor" className="text-yellow-400" />
          4.8
        </div>
      </div>

      <div className="flex flex-col flex-1 p-3 sm:p-4">
        <h3 className="font-semibold text-text-primary text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-brand-blue transition-colors mb-2">
          {tour.name}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-text-muted mb-3">
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {tour.destination}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {tour.duration_days} ngày
          </span>
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-[10px] text-text-muted">Giá từ</p>
            <p className="text-brand-accent font-bold text-sm sm:text-base leading-none">
              {formatPrice(tour.min_price)}
            </p>
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-brand-blue border border-brand-blue px-2 sm:px-3 py-1 rounded-full group-hover:bg-brand-blue group-hover:text-white transition-colors whitespace-nowrap">
            Xem tour
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Section Header ────────────────────────────────────────────
function SectionHeader({ tag, title, href, linkLabel = 'Xem tất cả' }: {
  tag: string; title: string; href: string; linkLabel?: string
}) {
  return (
    <div className="flex items-end justify-between mb-5 sm:mb-7">
      <div>
        <p className="text-brand-accent text-xs font-bold uppercase tracking-widest mb-1">{tag}</p>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">{title}</h2>
      </div>
      <Link
        href={href}
        className="hidden sm:flex items-center gap-1 text-sm font-semibold text-brand-blue hover:text-brand-light transition-colors shrink-0 ml-4"
      >
        {linkLabel} <ChevronRight size={16} />
      </Link>
    </div>
  )
}

// ── News feed (simplified for homepage) ──────────────────────
const NEWS = [
  {
    id: 'n1', title: 'Cẩm nang du lịch Hà Giang: Mùa hoa tam giác mạch tháng 10',
    summary: 'Hà Giang tháng 10 ngập tràn sắc hồng của hoa tam giác mạch. Đừng bỏ lỡ mùa đẹp nhất trong năm.',
    image: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=400&q=80',
    category: 'Miền Bắc', date: '29/05/2025', href: '#',
  },
  {
    id: 'n2', title: 'Top 10 điểm đến quốc tế hot nhất hè 2025 cho gia đình',
    summary: 'Những điểm đến phù hợp cho gia đình có trẻ em trong mùa hè 2025.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
    category: 'Nước ngoài', date: '28/05/2025', href: '#',
  },
  {
    id: 'n3', title: 'Hướng dẫn xin visa Nhật Bản 2025 mới nhất – từng bước chi tiết',
    summary: 'Quy trình xin visa Nhật đã thay đổi từ tháng 3/2025. Cập nhật toàn bộ hồ sơ, lệ phí.',
    image: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=400&q=80',
    category: 'Visa & Thủ tục', date: '27/05/2025', href: '#',
  },
  {
    id: 'n4', title: 'Phú Quốc mùa mưa có nên đi? Kinh nghiệm thực tế từ du khách',
    summary: 'Nhiều người lo ngại đi Phú Quốc vào mùa mưa. Thực tế thì sao?',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80',
    category: 'Trong nước', date: '26/05/2025', href: '#',
  },
]

// ── Page ──────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="relative">
          {/* Hero Image */}
          <div className="relative h-[260px] sm:h-[380px] md:h-[460px] lg:h-[540px] overflow-hidden">
            <Image
              src={HERO_SLIDES[0].image}
              alt={HERO_SLIDES[0].title}
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
            {/* Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pb-8 sm:pb-12">
              <p className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-widest mb-2 sm:mb-3">
                Nam Ngân Travel — Du lịch trọn gói
              </p>
              <h1 className="text-white font-bold text-2xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight drop-shadow-lg">
                {HERO_SLIDES[0].title}
              </h1>
              <p className="text-white/90 text-sm sm:text-base md:text-lg mt-2 sm:mt-3 drop-shadow">
                {HERO_SLIDES[0].subtitle}
              </p>
              <Link
                href={HERO_SLIDES[0].href}
                className="mt-4 sm:mt-6 inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-brand-accent hover:bg-orange-600 text-white font-semibold text-sm sm:text-base rounded-full transition-colors shadow-lg"
              >
                {HERO_SLIDES[0].cta} <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          {/* Search bar card — overlaps hero */}
          <div className="relative z-10 -mt-0 sm:-mt-8 px-3 sm:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="sm:rounded-2xl sm:shadow-2xl overflow-hidden">
                <ErrorBoundary moduleName="TourSearchBar">
                  <TourSearchBar />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </section>

        {/* ── SEARCH RESULTS (client, hiện khi user tìm kiếm) ── */}
        <SearchResults />

        {/* ── STATS BAR ────────────────────────────────────── */}
        <section className="bg-brand-blue text-white py-3 sm:py-4 mt-0 sm:mt-8">
          <div className="container-main">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0 sm:divide-x sm:divide-white/20 text-center">
              {[
                { num: '10.000+', label: 'Khách hàng hài lòng' },
                { num: '500+', label: 'Tour trong & ngoài nước' },
                { num: '10+', label: 'Năm kinh nghiệm' },
                { num: '4.9★', label: 'Đánh giá trung bình' },
              ].map((stat) => (
                <div key={stat.label} className="py-1 sm:py-0">
                  <p className="text-lg sm:text-2xl font-bold leading-none">{stat.num}</p>
                  <p className="text-white/75 text-[11px] sm:text-xs mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── POPULAR DESTINATIONS ─────────────────────────── */}
        <section className="py-8 sm:py-12 bg-brand-bg">
          <div className="container-main">
            <SectionHeader
              tag="Điểm đến"
              title="Điểm đến nổi bật"
              href="/tours"
              linkLabel="Tất cả điểm đến"
            />
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {POPULAR_DEST.map((dest) => (
                <Link
                  key={dest.name}
                  href={dest.href}
                  className="group relative rounded-xl overflow-hidden aspect-square sm:aspect-[3/4] bg-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <Image
                    src={dest.image}
                    alt={dest.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-white">
                    <p className="font-bold text-xs sm:text-sm leading-tight">{dest.name}</p>
                    <p className="text-[10px] text-white/75">{dest.count} tour</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTERNATIONAL TOURS ──────────────────────────── */}
        <section className="py-8 sm:py-12 bg-white">
          <div className="container-main">
            <SectionHeader
              tag="Du lịch quốc tế"
              title="Tour Nước Ngoài"
              href="/tours?category=international"
            />
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {INTL_TOURS.map((tour) => (
                <TourCardStatic key={tour.id} tour={tour} />
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link
                href="/tours?category=international"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
              >
                Xem tất cả tour quốc tế <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── PROMO BANNER ─────────────────────────────────── */}
        <section className="py-6 sm:py-8 bg-brand-bg">
          <div className="container-main">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#005BAA] to-[#0078D7] p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=60)', backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
              <div className="relative text-white text-center sm:text-left">
                <p className="text-white/75 text-xs sm:text-sm font-medium uppercase tracking-widest mb-1">Ưu đãi đặc biệt</p>
                <h3 className="text-xl sm:text-3xl font-bold leading-tight">
                  Giảm đến <span className="text-[#FFD166]">15%</span> cho đoàn từ 10 người
                </h3>
                <p className="text-white/80 text-sm mt-1.5">Liên hệ ngay để nhận báo giá ưu đãi nhóm tốt nhất</p>
              </div>
              <div className="relative flex flex-col sm:flex-row gap-3 shrink-0">
                <a
                  href="tel:0932611933"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent hover:bg-orange-600 text-white font-semibold text-sm rounded-full transition-colors shadow-lg whitespace-nowrap"
                >
                  <Phone size={15} />
                  Gọi ngay: 0932 611 933
                </a>
                <Link
                  href="/tours"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-brand-blue hover:bg-brand-bg font-semibold text-sm rounded-full transition-colors shadow-lg whitespace-nowrap"
                >
                  Chọn tour <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── DOMESTIC TOURS ───────────────────────────────── */}
        <section className="py-8 sm:py-12 bg-white">
          <div className="container-main">
            <SectionHeader
              tag="Du lịch trong nước"
              title="Tour Việt Nam"
              href="/tours?category=domestic"
            />
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {DOMESTIC_TOURS.map((tour) => (
                <TourCardStatic key={tour.id} tour={tour} />
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link
                href="/tours?category=domestic"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
              >
                Xem tất cả tour trong nước <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── WHY CHOOSE US ────────────────────────────────── */}
        <section className="py-8 sm:py-14 bg-brand-bg">
          <div className="container-main">
            <div className="text-center mb-8 sm:mb-10">
              <p className="text-brand-accent text-xs font-bold uppercase tracking-widest mb-2">Tại sao chọn chúng tôi</p>
              <h2 className="text-xl sm:text-3xl font-bold text-text-primary">Nam Ngân Travel — Đồng hành tin cậy</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {WHY_US.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="bg-white rounded-2xl p-5 sm:p-6 text-center shadow-sm hover:shadow-md transition-shadow border border-gray-50"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-bg rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Icon size={22} className="text-brand-blue" />
                    </div>
                    <h3 className="font-bold text-text-primary text-sm sm:text-base mb-2">{item.title}</h3>
                    <p className="text-text-muted text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── NEWS ─────────────────────────────────────────── */}
        <section className="py-8 sm:py-12 bg-white">
          <div className="container-main">
            <SectionHeader
              tag="Tin tức & Kinh nghiệm"
              title="Tin tức du lịch"
              href="/tin-tuc"
              linkLabel="Xem thêm"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {NEWS.map((article) => (
                <Link
                  key={article.id}
                  href={article.href}
                  className="group flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative h-40 sm:h-44 overflow-hidden bg-brand-bg">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 bg-brand-blue/90 text-white text-[10px] font-semibold rounded-full">
                        {article.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 p-3 sm:p-4">
                    <h3 className="font-semibold text-text-primary text-sm leading-snug line-clamp-2 group-hover:text-brand-blue transition-colors mb-2">
                      {article.title}
                    </h3>
                    <p className="text-text-muted text-xs leading-relaxed line-clamp-2 flex-1">
                      {article.summary}
                    </p>
                    <p className="text-text-muted text-[11px] mt-2">{article.date}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link
                href="/tin-tuc"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
              >
                Xem thêm tin tức <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── CONTACT CTA ──────────────────────────────────── */}
        <section className="py-8 sm:py-12 bg-[#0d2340]">
          <div className="container-main text-center">
            <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Liên hệ tư vấn miễn phí</p>
            <h2 className="text-white text-xl sm:text-3xl font-bold mb-3 sm:mb-4">
              Bạn cần tư vấn tour phù hợp?
            </h2>
            <p className="text-white/70 text-sm sm:text-base mb-6 sm:mb-8 max-w-xl mx-auto">
              Đội ngũ tư vấn của Nam Ngân Travel luôn sẵn sàng giúp bạn lên kế hoạch chuyến đi hoàn hảo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <a
                href="tel:0932611933"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-brand-accent hover:bg-orange-600 text-white font-semibold rounded-full transition-colors shadow-lg"
              >
                <Phone size={16} />
                Gọi: 0932 611 933
              </a>
              <Link
                href="/dat-tour"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-white text-white hover:bg-white hover:text-brand-blue font-semibold rounded-full transition-colors"
              >
                Đặt tour ngay <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Floating widgets */}
      <ErrorBoundary moduleName="ChatWidget">
        <ChatWidget />
      </ErrorBoundary>
      <ErrorBoundary moduleName="AutoPopup">
        <AutoPopup />
      </ErrorBoundary>
    </>
  )
}
