import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ADMIN_COOKIE } from '@/lib/admin-auth-constants'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function isAuthed(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
  if (secret === process.env.WEBHOOK_SECRET) return true
  return !!req.cookies.get(ADMIN_COOKIE)?.value
}

const DestinationSchema = z.object({
  name:       z.string().min(1),
  image_url:  z.string().url(),
  href:       z.string().min(1),
  sort_order: z.number().int().optional().default(0),
  is_active:  z.boolean().optional().default(true),
})

// GET — public (active only) or admin (?all=1 with cookie auth — shows all including inactive)
export async function GET(req: NextRequest) {
  const showAll = req.nextUrl.searchParams.get('all') === '1' && isAuthed(req)
  try {
    let query = supabaseAdmin
      .from('featured_destinations')
      .select('*')
      .order('sort_order', { ascending: true })
    if (!showAll) query = query.eq('is_active', true)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: 'Lỗi tải điểm đến' }, { status: 500 })
  }
}

// POST — admin: create new destination
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const parsed = DestinationSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('featured_destinations')
      .insert(parsed.data)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Lỗi tạo điểm đến' }, { status: 500 })
  }
}
