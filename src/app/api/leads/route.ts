import { NextResponse } from 'next/server'
import { LeadFormSchema } from '@/lib/validations/lead.schema'
import { createClient } from '@/lib/supabase/server'
import { triggerNotification } from '@/lib/notifications'

// POST /api/leads
// Nguyên tắc #7: sau khi INSERT → kích hoạt ĐỒNG THỜI Email (Resend) + Realtime broadcast
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = LeadFormSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({ ...parsed.data, status: 'new' })
      .select()
      .single()

    if (error) throw error

    // Luồng kép bắt buộc (Nguyên tắc #7)
    await triggerNotification({
      event:          'new_lead',
      lead_id:        lead.id,
      customer_name:  lead.full_name,
      customer_email: lead.email ?? undefined,
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
