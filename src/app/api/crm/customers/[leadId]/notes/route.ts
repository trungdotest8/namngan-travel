// POST /api/crm/customers/:leadId/notes — thêm ghi chú nội bộ vào lead_activities
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

const NoteSchema = z.object({
  content:     z.string().min(1).max(2000),
  staff_name:  z.string().max(100).optional(),
  action_type: z.enum(['note', 'call', 'email', 'other']).default('note'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { leadId: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leadId } = params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = NoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const supabase = createAdminClient()

  const { data: activity, error } = await supabase
    .from('lead_activities')
    .insert({
      lead_id:     leadId,
      staff_name:  parsed.data.staff_name ?? 'Admin',
      action_type: parsed.data.action_type,
      content:     parsed.data.content,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ activity }, { status: 201 })
}
