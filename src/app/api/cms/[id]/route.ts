import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAdminRequest } from '@/lib/admin-auth'

const ArticleUpdateSchema = z.object({
  title:         z.string().min(1).max(500).optional(),
  slug:          z.string().min(1).max(500).optional(),
  summary:       z.string().nullable().optional(),
  content:       z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  tags:          z.array(z.string()).optional(),
  category:      z.string().nullable().optional(),
  status:        z.enum(['draft', 'published', 'archived']).optional(),
  published_at:  z.string().datetime().nullable().optional(),
})

// ── PATCH /api/cms/[id] ───────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = ArticleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('articles')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Slug đã tồn tại, vui lòng chọn slug khác.' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json({ article: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── DELETE /api/cms/[id] ──────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', params.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
