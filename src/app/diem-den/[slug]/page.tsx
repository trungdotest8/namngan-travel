import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import DiemDenDetailClient from './DiemDenDetailClient'

interface Props {
  params: { slug: string }
}

// ── JSON-LD Place schema ──────────────────────────────────────────────────────

function buildPlaceSchema(name: string, imageUrl: string, slug: string) {
  return {
    '@context':  'https://schema.org',
    '@type':     'Place',
    name,
    image:       imageUrl,
    url:         `https://namngantravel.com/diem-den/${slug}`,
    description: `Khám phá ${name} cùng Nam Ngân Travel — tour trọn gói chuyên nghiệp, giá tốt.`,
    containedInPlace: {
      '@type': 'Country',
      name:    'Vietnam',
    },
  }
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('featured_destinations')
      .select('name, image_url')
      .eq('is_active', true)

    const dest = (data ?? []).find(d => slugify(d.name) === params.slug)
    if (!dest) {
      return { title: 'Điểm Đến Du Lịch — Nam Ngân Travel' }
    }

    return {
      title:       `Du lịch ${dest.name} — Tour Trọn Gói Uy Tín | Nam Ngân Travel`,
      description: `Khám phá ${dest.name} cùng Nam Ngân Travel. Tour trọn gói chất lượng cao, giá tốt, chuyên viên tư vấn lịch trình miễn phí.`,
      openGraph: {
        title:       `Du lịch ${dest.name} — Nam Ngân Travel`,
        description: `Tour ${dest.name} trọn gói uy tín, giá tốt. Tư vấn lịch trình miễn phí từ Nam Ngân Travel.`,
        images:      dest.image_url
          ? [{ url: dest.image_url, width: 1200, height: 630, alt: dest.name }]
          : [{ url: '/og-default.jpg', width: 1200, height: 630 }],
        type:        'website',
      },
      alternates: { canonical: `https://namngantravel.com/diem-den/${params.slug}` },
    }
  } catch {
    return { title: 'Điểm Đến Du Lịch — Nam Ngân Travel' }
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DiemDenDetailPage({ params }: Props) {
  // Fetch server-side chỉ để nhúng JSON-LD; client component tự fetch đầy đủ
  let placeSchema: object | null = null
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('featured_destinations')
      .select('name, image_url')
      .eq('is_active', true)
    const dest = (data ?? []).find(d => slugify(d.name) === params.slug)
    if (dest) placeSchema = buildPlaceSchema(dest.name, dest.image_url, params.slug)
  } catch {
    // JSON-LD optional — không crash page
  }

  return (
    <>
      {placeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
        />
      )}
      <DiemDenDetailClient params={params} />
    </>
  )
}
