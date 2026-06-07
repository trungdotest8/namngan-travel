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

const PatchSchema = z.object({
  name:       z.string().min(1).optional(),
  image_url:  z.string().url().optional(),
  href:       z.string().min(1).optional(),
  sort_order: z.number().int().optional(),
  is_active:  z.boolean().optional(),
})

// PATCH — admin: update destination
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('featured_destinations')
      .update(parsed.data)
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: 'Lỗi cập nhật điểm đến' }, { status: 500 })
  }
}

// DELETE — admin: remove destination
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { error } = await supabaseAdmin
      .from('featured_destinations')
      .delete()
      .eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Lỗi xóa điểm đến' }, { status: 500 })
  }
}
