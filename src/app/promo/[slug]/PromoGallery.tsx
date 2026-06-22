import Image from 'next/image';
import type { TourImage } from '@/types/landing-page';

// Tiny 1×1 px shimmer base64 dùng cho placeholder blur
const BLUR_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=';

interface Props {
  images: TourImage[];
}

export default function PromoGallery({ images }: Props) {
  if (images.length === 0) return null;

  return (
    <section className="py-10 px-4 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-[#1A1A2E] mb-5 text-center">Hình ảnh chuyến đi</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden">
            <Image
              src={img.url}
              alt={img.alt}
              title={img.caption ?? img.alt}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_URL}
              priority={i === 0}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
