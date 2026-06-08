import { NextResponse, type NextRequest } from 'next/server'
import { ActivityInsertSchema } from '@/lib/validations/lead-capture.schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_COOKIE } from '@/lib/admin-auth-constants'

function isAuthed(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
  if (secret && secret === process.env.WEBHOOK_SECRET) return true
  return !!req.cookies.get(ADMIN_COOKIE)?.value
}

// GET /api/leads/[id]/activities  — lịch sử tương tác của 1 lead
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ activities: data ?? [] })
}

// POST /api/leads/[id]/activities  — thêm ghi chú / hành động chăm sóc
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = ActivityInsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { staff_name, action_type, content } = parsed.data

  const supabase = createAdminClient()
  const { data: activity, error } = await supabase
    .from('lead_activities')
    .insert({
      lead_id:     id,
      staff_name:  staff_name ?? 'Admin',
      action_type,
      content,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Broadcast realtime — admin panel tự refresh nếu đang xem lead này
  supabase
    .channel('admin-notifications')
    .send({
      type:    'broadcast',
      event:   'lead_activity',
      payload: { lead_id: id, activity_id: activity.id, action_type },
    })
    .catch((e: unknown) => console.error('[Activities] broadcast thất bại:', e))

  return NextResponse.json({ activity }, { status: 201 })
}
