// ── Realtime Pub/Sub (Supabase Channel: 'admin-notifications') ──

export type NotificationEvent =
  | 'new_lead'
  | 'new_booking'
  | 'booking_confirmed'
  | 'lead_status_changed'
  | 'new_article'
  | 'new_tour'
  | 'tour_updated'
  | 'destination_changed'

export interface RealtimeNotification {
  id: string
  event: NotificationEvent
  title: string
  body: string
  meta?: Record<string, unknown>
  created_at: string
  read: boolean
}

// ── Email Notifications (Resend) ──

export type EmailTemplateId =
  | 'lead-received'
  | 'booking-confirmation'
  | 'itinerary-updated'
  | 'promo-notify'
  | 'welcome-lead'

export interface EmailPayload {
  template: EmailTemplateId
  to: string | string[]
  subject: string
  data: Record<string, unknown>
}

export interface NotificationTriggerPayload {
  event: NotificationEvent
  lead_id?: string
  booking_id?: string
  customer_name?: string
  tour_title?: string
  depart_date?: string
  customer_email?: string
  // Extended fields
  article_title?: string
  destination_name?: string
  detail?: string
}
