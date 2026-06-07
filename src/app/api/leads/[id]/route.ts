import { NextResponse, type NextRequest } from 'next/server'
import { LeadStatusUpdateSchema } from '@/lib/validations/lead-capture.schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_COOKIE } from '@/lib/admin-auth-constants'

function isAuthed(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
  if (secret && secret === process.env.WEBHOOK_SECRET) return true
  return !!req.cookies.get(ADMIN_COOKIE)?.value
}

// PATCH /api/leads/[id]  — cập nhật trạng thái + điểm lead
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = LeadStatusUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { lead_status, lead_score } = parsed.data
  const updateData: Record<string, unknown> = { status: lead_status }
  if (lead_score !== undefined) updateData.lead_score = lead_score

  const supabase = createAdminClient()
  const { data: lead, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!lead)  return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  return NextResponse.json({ lead })
}
