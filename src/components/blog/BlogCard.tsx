import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Tag, Clock } from 'lucide-react'

interface BlogCardProps {
  title:         string
  slug:          string
  summary:       string | null
  thumbnail_url: string | null
  category:      string | null
  tags?:         string[] | null
  published_at:  string | null
  reading_time?: number
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function BlogCard({ title, slug, summary, thumbnail_url, category, tags, published_at, reading_time }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative h-48 sm:h-52 overflow-hidden bg-[#F0F7FF]">
        {thumbnail_url ? (
          <Image
            src={thumbnail_url}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[#005BAA]/30 text-4xl font-bold">NN</span>
          </div>
        )}
        {category && (
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-[#005BAA]/90 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full">
              {category}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        <h3 className="font-bold text-[#1A1A2E] text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-[#005BAA] transition-colors mb-2">
          {title}
        </h3>

        {summary && (
          <p className="text-[#666666] text-xs sm:text-sm leading-relaxed line-clamp-2 flex-1 mb-3">
            {summary}
          </p>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] text-[#005BAA] bg-[#F0F7FF] px-2 py-0.5 rounded-md"
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-[#666666] border-t border-gray-100 pt-3 mt-auto">
          {published_at && (
            <span className="flex items-center gap-1">
              <Calendar size={11} className="text-[#005BAA]" />
              {formatDate(published_at)}
            </span>
          )}
          {reading_time != null && (
            <span className="flex items-center gap-1 ml-auto">
              <Clock size={11} />
              {reading_time} phút đọc
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
