// GET /api/crm/customers/:leadId — full customer profile + booking history
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
  const supabase = createAdminClient()

  // Lead profile
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle()

  if (error || !lead) {
    return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 })
  }

  // Booking history (nếu có user với phone tương ứng)
  let bookings: unknown[] = []
  if (lead.phone) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone', lead.phone)
      .maybeSingle()

    if (user?.id) {
      const { data } = await supabase
        .from('bookings')
        .select(`
          id, code, booking_status, payment_status, final_price, created_at,
          tour_schedules (
            departure_date, return_date,
            tours ( name, destination, thumbnail_url )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      bookings = data ?? []
    }
  }

  // Ticket summary
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, ticket_code, subject, status, priority, created_at, first_response_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({ lead, bookings, tickets: tickets ?? [] })
}
