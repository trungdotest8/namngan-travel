// GET /api/crm/customers/:leadId/conversations — lịch sử hội thoại omnichannel
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leadId } = params
  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200)

  const supabase = createAdminClient()

  const { data: logs, error } = await supabase
    .from('conversation_logs')
    .select(`
      id, direction, channel, message_text, tg_message_id, sent_at,
      zalo_accounts ( account_name, department ),
      admin_users   ( display_name )
    `)
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversations: logs ?? [] })
}
