import Link from 'next/link'
import { Phone, Mail, MapPin, Facebook, Youtube } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#0d2340] text-gray-300">
      <div className="container-main py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center shrink-0">
              <span className="text-white font-black text-sm">NN</span>
            </div>
            <div className="leading-tight">
              <div className="font-bold text-white text-base leading-none">Nam Ngân Travel</div>
              <div className="text-[11px] text-gray-400 tracking-wide uppercase">Du lịch trọn gói</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-400">
            Đồng hành cùng hàng ngàn du khách khám phá vẻ đẹp Việt Nam và thế giới. Chất lượng — Uy tín — Tận tâm.
          </p>
          <div className="flex gap-3">
            <a href="https://facebook.com" target="_blank" rel="noreferrer"
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-blue transition-colors">
              <Facebook size={15} />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer"
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-600 transition-colors">
              <Youtube size={15} />
            </a>
          </div>
        </div>

        {/* Tour links */}
        <div>
          <h3 className="text-white font-semibold mb-4">Tour nổi bật</h3>
          <ul className="space-y-2 text-sm">
            {[
              ['Nhật Bản — Tokyo · Osaka', '/tour-nuoc-ngoai?country=NH%E1%BA%ACT+B%E1%BA%A2N'],
              ['Hàn Quốc — Seoul · Jeju', '/tour-nuoc-ngoai?country=H%C3%80N+QU%E1%BB%90C'],
              ['Thái Lan — Bangkok · Pattaya', '/tour-nuoc-ngoai?country=TH%C3%81I+LAN'],
              ['Đà Nẵng — Hội An', '/tour-trong-nuoc'],
              ['Phú Quốc — Đảo ngọc', '/tour-trong-nuoc'],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="hover:text-white hover:underline transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-white font-semibold mb-4">Liên kết nhanh</h3>
          <ul className="space-y-2 text-sm">
            {[
              ['Về chúng tôi', '/ve-chung-toi'],
              ['Chính sách bảo mật', '/chinh-sach-bao-mat'],
              ['Điều khoản dịch vụ', '/dieu-khoan'],
              ['Hỏi đáp thường gặp', '/faq'],
              ['Tuyển dụng', '/tuyen-dung'],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="hover:text-white hover:underline transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-white font-semibold mb-4">Liên hệ</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0 text-brand-accent" />
              <span>123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={15} className="shrink-0 text-brand-accent" />
              <a href="tel:0932611933" className="hover:text-white transition-colors">0932 611 933</a>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={15} className="shrink-0 text-brand-accent" />
              <a href="tel:0774623514" className="hover:text-white transition-colors">0774 623 514 (Zalo)</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={15} className="shrink-0 text-brand-accent" />
              <a href="mailto:info@namngantravel.com" className="hover:text-white transition-colors">
                info@namngantravel.com
              </a>
            </li>
          </ul>
          <div className="mt-4 p-3 bg-white/5 rounded-lg text-xs text-gray-400">
            <p className="font-semibold text-white mb-1">Giờ làm việc</p>
            <p>T2 – T6: 08:00 – 18:00</p>
            <p>T7 – CN: 08:00 – 12:00</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-main py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} Nam Ngân Travel. Bảo lưu mọi quyền.</span>
          <span>GPLHKD: 0123456789 — TCDL: 123/TCDL-GP</span>
        </div>
      </div>
    </footer>
  )
}
