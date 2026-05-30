'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Phone, MapPin } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Trang chủ',    href: '/' },
  { label: 'Tour trong nước', href: '/tours?category=domestic' },
  { label: 'Tour quốc tế',    href: '/tours?category=international' },
  { label: 'Lịch khởi hành', href: '/lich-khoi-hanh' },
  { label: 'Tin tức',        href: '/tin-tuc' },
  { label: 'Liên hệ',        href: '/lien-he' },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-brand-blue text-white text-sm py-1.5">
        <div className="container-main flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <MapPin size={13} />
            <span>Địa chỉ: 123 Lê Lợi, Q.1, TP.HCM</span>
          </span>
          <a
            href="tel:0932611933"
            className="flex items-center gap-1.5 font-semibold hover:text-orange-300 transition-colors"
          >
            <Phone size={13} />
            <span>0932 611 933</span>
          </a>
        </div>
      </div>

      {/* Main nav */}
      <nav className="container-main flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center">
            <span className="text-white font-black text-sm leading-none">NN</span>
          </div>
          <div className="leading-tight">
            <div className="font-bold text-brand-blue text-base leading-none">Nam Ngân</div>
            <div className="text-[11px] text-text-secondary tracking-wide uppercase">Travel</div>
          </div>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-text-primary rounded hover:text-brand-blue hover:bg-brand-bg transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/dat-tour"
            className="px-5 py-2 bg-brand-accent text-white text-sm font-semibold rounded-full hover:bg-orange-600 transition-colors"
          >
            Đặt tour ngay
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="lg:hidden p-2 rounded text-text-primary hover:bg-brand-bg"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <ul className="container-main py-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block px-3 py-2.5 text-sm font-medium text-text-primary rounded hover:text-brand-blue hover:bg-brand-bg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href="/dat-tour"
                className="block text-center px-5 py-2.5 bg-brand-accent text-white text-sm font-semibold rounded-full"
                onClick={() => setMobileOpen(false)}
              >
                Đặt tour ngay
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
