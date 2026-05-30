export interface N8nPayload {
  event: 'sync_departures' | 'new_lead_notify' | 'publish_news' | string
  data: Record<string, unknown>
  secret: string
}

export interface ModaBookingPayload {
  booking_id: string
  tour_slug: string
  depart_date: string
  customer: {
    name: string
    phone: string
    email: string
  }
  total_amount: number
  status: 'pending' | 'confirmed' | 'cancelled'
}

export interface WebhookHandler<T = unknown> {
  verify(payload: T, secret: string): boolean
  handle(payload: T): Promise<{ success: boolean; message?: string }>
}
