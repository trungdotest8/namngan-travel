import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ── Zod schemas ───────────────────────────────────────────────

const GetQuerySchema = z.object({
  source_type: z.enum(['manual', 'rss', 'tiktok', 'facebook']).optional(),
  status:      z.enum(['draft', 'published', 'archived']).default('published'),
  limit:       z.coerce.number().int().min(1).max(100).default(50),
})

const ArticleCreateSchema = z.object({
  title:         z.string().min(1).max(500),
  slug:          z.string().min(1).max(500),
  summary:       z.string().nullable().optional(),
  content:       z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  source_type:   z.enum(['manual', 'rss', 'tiktok', 'facebook']).default('manual'),
  source_url:    z.string().url().nullable().optional(),
  source_meta:   z.record(z.unknown()).nullable().optional(),
  tags:          z.array(z.string()).default([]),
  category:      z.string().nullable().optional(),
  status:        z.enum(['draft', 'published', 'archived']).default('draft'),
  published_at:  z.string().datetime().nullable().optional(),
})

// ── GET /api/cms ──────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = GetQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { source_type, status, limit } = parsed.data

    const supabase = await createClient()
    let query = supabase
      .from('articles')
      .select('*')
      .eq('status', status)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (source_type) query = query.eq('source_type', source_type)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ articles: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── POST /api/cms ─────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = ArticleCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('articles')
      .insert(parsed.data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ article: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
