import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

// ── Zod schema ───────────────────────────────────────────────────────────────

const TourUpdateSchema = z.object({
  name:          z.string().min(1).max(500).optional(),
  code:          z.string().min(1).max(50).optional(),
  slug:          z.string().min(1).max(500).optional(),
  destination:   z.string().nullable().optional(),
  country:       z.string().nullable().optional(),
  category:      z.enum(['trong nước', 'nước ngoài']).nullable().optional(),
  duration_days: z.coerce.number().int().min(1).nullable().optional(),
  description:   z.string().nullable().optional(),
  highlights:    z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  gallery_urls:  z.array(z.string().url()).optional(),
  images:        z.array(z.string().url()).nullable().optional(),
  hashtags:      z.array(z.string()).optional(),
  is_active:     z.boolean().optional(),
})

// ── PATCH /api/tours/[id] ────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const parsed = TourUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'Không có trường nào để cập nhật' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Kiểm tra slug/code trùng nếu có thay đổi
    if (parsed.data.slug) {
      const { data: dup } = await supabase
        .from('tours')
        .select('id')
        .eq('slug', parsed.data.slug)
        .neq('id', params.id)
        .maybeSingle()
      if (dup) {
        return NextResponse.json({ error: `Slug "${parsed.data.slug}" đã được dùng` }, { status: 409 })
      }
    }

    const { data, error } = await supabase
      .from('tours')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      // PGRST116 = query returned 0 rows → tour ID không tồn tại
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour không tồn tại' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ tour: data })
  } catch (err) {
    console.error('[PATCH /api/tours/[id]]', err)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

// ── DELETE /api/tours/[id] ───────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const hard = searchParams.get('hard') === 'true'

    const supabase = createAdminClient()

    if (hard) {
      const { error } = await supabase.from('tours').delete().eq('id', params.id)
      if (error) throw error
      return NextResponse.json({ deleted: true })
    }

    // Soft delete: ẩn tour (is_active = false)
    const { data, error } = await supabase
      .from('tours')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('id, is_active')
      .single()

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour không tồn tại' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ tour: data, deactivated: true })
  } catch (err) {
    console.error('[DELETE /api/tours/[id]]', err)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
