// PATCH /api/crm/tickets/:id — cập nhật status/priority/assigned_admin ticket
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

const TicketUpdateSchema = z.object({
  status:           z.enum(['open','in_progress','resolved','closed']).optional(),
  priority:         z.enum(['low','normal','high','urgent']).optional(),
  assigned_admin_id: z.string().uuid().optional(),
  subject:          z.string().max(200).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = TicketUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const updates: Record<string, unknown> = { ...parsed.data }

  // Tự động set resolved_at khi chuyển sang resolved/closed
  if (parsed.data.status === 'resolved' || parsed.data.status === 'closed') {
    updates.resolved_at = new Date().toISOString()
  }

  const supabase = createAdminClient()

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!ticket) {
    return NextResponse.json({ error: 'Không tìm thấy ticket' }, { status: 404 })
  }

  return NextResponse.json({ ticket })
}
