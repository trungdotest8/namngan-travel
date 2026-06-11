import { redirect } from 'next/navigation'

interface Props {
  params: { slug: string }
}

// /tours/{slug} → /tour/{slug} (canonical URL)
// Không cần DB query — /tour/{slug} sẽ tự handle notFound nếu slug không tồn tại
export default function TourBySlugPage({ params }: Props) {
  redirect(`/tour/${params.slug}`)
}
