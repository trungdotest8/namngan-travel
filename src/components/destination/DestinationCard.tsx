import Image from 'next/image'
import Link from 'next/link'
import { MapPin, ChevronRight } from 'lucide-react'

interface DestinationCardProps {
  name:      string
  slug:      string
  image_url: string
  country?:  string
  tour_count?: number
}

export function DestinationCard({ name, slug, image_url, country, tour_count }: DestinationCardProps) {
  return (
    <Link
      href={`/diem-den/${slug}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={image_url}
          alt={name}
          fill
          className="object-cover group-hover:scale-108 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>

      {/* Info overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h3 className="font-bold text-base sm:text-lg leading-tight">{name}</h3>
        {country && (
          <div className="flex items-center gap-1 text-white/80 text-xs mt-0.5">
            <MapPin size={11} />
            {country}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          {tour_count != null && (
            <span className="text-white/70 text-xs">{tour_count} tour</span>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:text-white transition-colors">
            Khám phá <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  )
}
