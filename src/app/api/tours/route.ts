import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAdminRequest } from '@/lib/admin-auth'

// ── Zod schemas ─────────────────────────────────────────────────────────────

const GetQuerySchema = z.object({
  category:  z.string().optional(),
  country:   z.string().optional(),
  is_active: z.enum(['true', 'false', 'all']).default('all'),
  search:    z.string().optional(),
  limit:     z.coerce.number().int().min(1).max(500).default(200),
  offset:    z.coerce.number().int().min(0).default(0),
})

const TourCreateSchema = z.object({
  name:          z.string().min(1).max(500),
  code:          z.string().min(1).max(50),
  slug:          z.string().min(1).max(500),
  destination:   z.string().nullable().optional(),
  country:       z.string().nullable().optional(),
  category:      z.enum(['trong nước', 'nước ngoài']).nullable().optional(),
  duration_days: z.coerce.number().int().min(1).nullable().optional(),
  description:   z.string().nullable().optional(),
  highlights:    z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  gallery_urls:  z.array(z.string().url()).default([]),
  hashtags:      z.array(z.string()).default([]),
  is_active:     z.boolean().default(true),
})

// ── GET /api/tours ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = GetQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { category, country, is_active, search, limit, offset } = parsed.data

    const supabase = await createClient()
    let query = supabase
      .from('tours')
      .select('id, code, name, slug, destination, country, category, duration_days, thumbnail_url, gallery_urls, hashtags, is_active, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category)            query = query.eq('category', category)
    if (country)             query = query.eq('country', country)
    if (is_active === 'true')  query = query.eq('is_active', true)
    if (is_active === 'false') query = query.eq('is_active', false)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ tours: data ?? [], total: data?.length ?? 0 })
  } catch (err) {
    console.error('[GET /api/tours]', err)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

// ── POST /api/tours ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const parsed = TourCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const supabase = await createClient()

    // Kiểm tra code trùng
    const { data: existing } = await supabase
      .from('tours')
      .select('id')
      .eq('code', parsed.data.code)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: `Mã tour "${parsed.data.code}" đã tồn tại` }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('tours')
      .insert({ ...parsed.data })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ tour: data }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/tours]', err)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
