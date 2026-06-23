// GET /api/crm/tickets — danh sách support tickets, filter theo status/priority
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const status   = url.searchParams.get('status')   // open | in_progress | resolved | closed
  const priority = url.searchParams.get('priority') // low | normal | high | urgent
  const page     = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit    = Math.min(Number(url.searchParams.get('limit') ?? '20'), 100)
  const offset   = (page - 1) * limit

  const supabase = createAdminClient()

  let query = supabase
    .from('support_tickets')
    .select(`
      id, ticket_code, subject, status, priority, created_at,
      first_response_at, resolved_at,
      leads ( id, full_name, phone, status ),
      admin_users ( display_name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)   query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)

  const { data: tickets, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tickets: tickets ?? [], total: count ?? 0, page, limit })
}
