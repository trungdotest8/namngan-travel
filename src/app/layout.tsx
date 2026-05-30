import type { Metadata } from 'next'
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google'
import './globals.css'

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Nam Ngân Travel — Du lịch trọn gói',
    template: '%s | Nam Ngân Travel',
  },
  description: 'Khám phá hàng trăm tour du lịch trong nước và quốc tế với Nam Ngân Travel.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Nam Ngân Travel',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${playfairDisplay.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
