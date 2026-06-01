import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: { slug: string }
}

export default async function TourBySlugPage({ params }: Props) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('tours')
    .select('id')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!data) notFound()

  redirect(`/tour/${data.id}`)
}
