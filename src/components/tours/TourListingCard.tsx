import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, MapPin } from 'lucide-react'

export interface TourListingCardProps {
  id:             string
  name:           string
  destination:    string | null
  country?:       string | null
  duration_days:  number | null
  thumbnail_url:  string | null
  next_departure: string | null   // "YYYY-MM-DD"
  min_price:      number | null
  category:       string | null
}

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + ' ₫'
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function TourListingCard({
  id, name, destination, country, duration_days,
  thumbnail_url, next_departure, min_price, category,
}: TourListingCardProps) {
  const isIntl    = category === 'nước ngoài'
  const badgeCls  = isIntl
    ? 'bg-[#005BAA] text-white'
    : 'bg-emerald-600 text-white'
  const badgeText = isIntl ? 'Quốc tế' : 'Trong nước'
  const displayDest = country && isIntl ? country : destination

  return (
    <Link
      href={`/tour/${id}`}
      className="group flex flex-col rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {thumbnail_url ? (
          <Image
            src={thumbnail_url}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#F0F7FF] to-[#D0E8FF]">
            <MapPin size={32} className="text-[#005BAA] opacity-40" />
          </div>
        )}
        <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-xs font-semibold ${badgeCls}`}>
          {badgeText}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-[#1A1A2E] text-sm leading-snug line-clamp-2 group-hover:text-[#005BAA] transition-colors">
          {name}
        </h3>

        <div className="flex items-center gap-3 text-xs text-[#666666]">
          {displayDest && (
            <span className="flex items-center gap-1 truncate">
              <MapPin size={12} />
              {displayDest}
            </span>
          )}
          {duration_days && (
            <span className="flex items-center gap-1 shrink-0">
              <Clock size={12} />
              {duration_days} ngày
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-[#666666]">
          <Calendar size={12} />
          {next_departure
            ? <span>Khởi hành: <span className="font-medium text-[#1A1A2E]">{formatDate(next_departure)}</span></span>
            : <span className="italic">Liên hệ để biết lịch</span>
          }
        </div>

        <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-100">
          <div>
            {min_price && min_price > 0 ? (
              <span className="text-sm font-bold text-[#FF6B00]">
                Từ {formatVND(min_price)}
              </span>
            ) : (
              <span className="text-xs text-[#666666] italic">Liên hệ báo giá</span>
            )}
          </div>
          <span className="text-xs font-semibold text-[#005BAA] bg-[#F0F7FF] px-3 py-1 rounded-full">
            Xem tour
          </span>
        </div>
      </div>
    </Link>
  )
}
