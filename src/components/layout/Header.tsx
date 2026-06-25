'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X, Phone, MapPin, ChevronDown, Globe } from 'lucide-react'
import { INTL_COLUMNS, DOMESTIC_COLUMNS } from '@/lib/mega-menu-data'

type NavLink =
  | { label: string; href: string; megaMenu?: never }
  | { label: string; href: string; megaMenu: 'intl' | 'domestic' }

const NAV_LINKS: NavLink[] = [
  { label: 'Trang chủ',          href: '/' },
  { label: 'Tất cả tour',        href: '/tours' },
  { label: 'Du lịch trong nước', href: '/tour-trong-nuoc', megaMenu: 'domestic' },
  { label: 'Du lịch nước ngoài', href: '/tour-nuoc-ngoai', megaMenu: 'intl' },
  { label: 'Lịch khởi hành',     href: '/lich-khoi-hanh' },
  { label: 'Tin tức',            href: '/tin-tuc' },
  { label: 'Liên hệ',            href: '/lien-he' },
]

export default function Header() {
  const [mobileOpen,     setMobileOpen]     = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const [openMenu,       setOpenMenu]       = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleMenuEnter(label: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenMenu(label)
  }

  function handleMenuLeave() {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120)
  }

  function buildIntlHref(country: string) {
    return '/tour-nuoc-ngoai?country=' + encodeURIComponent(country)
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-brand-blue text-white text-sm py-1.5">
        <div className="container-main flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <MapPin size={13} />
            <span>525/44 Huỳnh Văn Bánh, P. Phú Nhuận, Q. Phú Nhuận, TP.HCM</span>
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
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="https://res.cloudinary.com/dykx5rz7m/image/upload/v1782390217/nntravel_jjo3oj.png"
            alt="Nam Ngân Travel"
            width={140}
            height={48}
            className="h-12 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li
              key={link.href + link.label}
              className="relative"
              onMouseEnter={() => link.megaMenu ? handleMenuEnter(link.label) : undefined}
              onMouseLeave={() => link.megaMenu ? handleMenuLeave() : undefined}
            >
              <Link
                href={link.href}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-text-primary
                           rounded hover:text-brand-blue hover:bg-brand-bg transition-colors"
              >
                {link.label}
                {link.megaMenu && (
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${openMenu === link.label ? 'rotate-180' : ''}`}
                  />
                )}
              </Link>

              {/* Mega-menu panel */}
              {link.megaMenu && openMenu === link.label && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50
                             bg-white border border-gray-100 rounded-2xl shadow-2xl
                             w-[700px] p-6 animate-fade-in-down"
                  onMouseEnter={() => handleMenuEnter(link.label)}
                  onMouseLeave={handleMenuLeave}
                >
                  {/* Panel header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-brand-accent" />
                      <span className="text-xs font-bold uppercase tracking-widest text-brand-accent">
                        {link.megaMenu === 'intl' ? 'Điểm đến quốc tế' : 'Điểm đến trong nước'}
                      </span>
                    </div>
                    <Link
                      href={link.href}
                      className="text-xs font-semibold text-brand-blue hover:text-brand-light transition-colors"
                      onClick={() => setOpenMenu(null)}
                    >
                      Xem tất cả →
                    </Link>
                  </div>

                  {/* 3-column grid */}
                  <div className="grid grid-cols-3 gap-x-4">
                    {(link.megaMenu === 'intl' ? INTL_COLUMNS : DOMESTIC_COLUMNS).map((col, colIdx) => (
                      <ul key={colIdx} className="space-y-0.5">
                        {col.map((dest, rowIdx) => (
                          <li key={`${colIdx}-${rowIdx}`}>
                            <Link
                              href={
                                link.megaMenu === 'intl'
                                  ? buildIntlHref(dest.country)
                                  : '/tour-trong-nuoc'
                              }
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm
                                         text-text-primary hover:text-brand-blue hover:bg-brand-bg
                                         transition-colors group/item"
                              onClick={() => setOpenMenu(null)}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent/40
                                               group-hover/item:bg-brand-accent shrink-0 transition-colors" />
                              {dest.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/dat-tour"
            className="px-5 py-2 bg-brand-accent text-white text-sm font-semibold rounded-full
                       hover:bg-orange-600 transition-colors"
          >
            Đặt tour ngay
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="lg:hidden p-2 rounded text-text-primary hover:bg-brand-bg transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white animate-fade-in max-h-[80vh] overflow-y-auto">
          <ul className="container-main py-3 flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href + link.label}>
                {link.megaMenu ? (
                  <>
                    <button
                      onClick={() =>
                        setMobileExpanded((v) => (v === link.label ? null : link.label))
                      }
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm
                                 font-medium text-text-primary rounded hover:text-brand-blue
                                 hover:bg-brand-bg transition-colors"
                    >
                      {link.label}
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${
                          mobileExpanded === link.label ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {mobileExpanded === link.label && (
                      <div className="pl-4 pb-2 animate-fade-in">
                        <Link
                          href={link.href}
                          className="block px-3 py-1.5 text-xs font-semibold text-brand-blue"
                          onClick={() => setMobileOpen(false)}
                        >
                          → Xem tất cả
                        </Link>
                        <div className="grid grid-cols-2 gap-x-2">
                          {(link.megaMenu === 'intl' ? INTL_COLUMNS : DOMESTIC_COLUMNS)
                            .flat()
                            .map((dest, idx) => (
                              <Link
                                key={idx}
                                href={
                                  link.megaMenu === 'intl'
                                    ? buildIntlHref(dest.country)
                                    : '/tour-trong-nuoc'
                                }
                                className="block px-3 py-1.5 text-sm text-text-secondary
                                           hover:text-brand-blue transition-colors"
                                onClick={() => setMobileOpen(false)}
                              >
                                {dest.label}
                              </Link>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={link.href}
                    className="block px-3 py-2.5 text-sm font-medium text-text-primary rounded
                               hover:text-brand-blue hover:bg-brand-bg transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
            <li className="pt-2">
              <Link
                href="/dat-tour"
                className="block text-center px-5 py-2.5 bg-brand-accent text-white text-sm
                           font-semibold rounded-full hover:bg-orange-600 transition-colors"
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
