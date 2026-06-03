import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

const DRIVE_REGEX = /^https:\/\/(drive|docs)\.google\.com\//

const PatchSchema = z.object({
  lead_id: z.string().uuid(),
  google_drive_url: z
    .string()
    .regex(DRIVE_REGEX, 'Phải là link Google Drive hoặc Docs hợp lệ')
    .optional()
    .or(z.literal('')),
  image_attachments: z.array(z.string().url()).optional(),
})

// GET /api/customer-profile?search=&status=&source=&limit=50
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? ''
    const source = searchParams.get('source') ?? ''
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

    const supabase = createAdminClient()
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)
    if (source) query = query.eq('lead_source', source)
    if (search) query = query.ilike('full_name', `%${search}%`)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ leads: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// PATCH /api/customer-profile — cập nhật google_drive_url hoặc image_attachments
export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { lead_id, ...updates } = parsed.data

    // '' → null để đảm bảo IS NULL query hoạt động đúng
    const patch: Record<string, unknown> = {}
    if (updates.google_drive_url !== undefined) {
      patch.google_drive_url = updates.google_drive_url === '' ? null : updates.google_drive_url
    }
    if (updates.image_attachments !== undefined) {
      patch.image_attachments = updates.image_attachments
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Không có trường nào để cập nhật' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', lead_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ lead: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
