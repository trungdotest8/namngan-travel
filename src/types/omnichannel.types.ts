export interface ZaloAccount {
  id: string
  oa_id: string | null
  phone_number: string
  account_name: string
  department: 'sales' | 'support' | 'booking' | null
  access_token: string | null
  refresh_token: string | null
  telegram_chat_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TelegramZaloMapping {
  id: string
  tg_message_id: number
  zalo_account_id: string
  customer_zalo_id: string
  lead_id: string | null
  created_at: string
}

export interface ConversationLog {
  id: string
  lead_id: string | null
  zalo_account_id: string | null
  direction: 'inbound' | 'outbound'
  channel: 'zalo' | 'telegram' | 'facebook'
  message_text: string | null
  tg_message_id: number | null
  admin_user_id: string | null
  sent_at: string
}

export interface SupportTicket {
  id: string
  ticket_code: string
  lead_id: string | null
  booking_id: string | null
  subject: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assigned_admin_id: string | null
  first_response_at: string | null
  resolved_at: string | null
  created_at: string
}
