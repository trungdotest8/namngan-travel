export type BookingStatus  = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type PaymentStatus  = 'pending' | 'partial' | 'paid' | 'refunded'
export type PaymentMethod  = 'wallet' | 'bank_transfer' | 'cash' | 'online'

export interface Booking {
  id:               string
  code:             string        // "NN-20250001"
  user_id:          string
  tour_schedule_id: string
  adults:           number
  children:         number
  price_adult:      number        // VND snapshot lúc đặt
  price_child:      number        // VND snapshot lúc đặt
  total_price:      number        // generated: adults*price_adult + children*price_child
  discount_amount:  number
  final_price:      number        // generated: total_price - discount_amount
  payment_method:   PaymentMethod | null
  payment_status:   PaymentStatus
  booking_status:   BookingStatus
  contact_name:     string
  contact_phone:    string
  contact_email:    string | null
  special_requests: string | null
  cancelled_at:     string | null
  cancel_reason:    string | null
  created_at:       string
  updated_at:       string
}

export interface BookingFormData {
  tour_schedule_id: string
  adults:           number
  children:         number
  contact_name:     string
  contact_phone:    string
  contact_email?:   string
  special_requests?: string
  payment_method:   PaymentMethod
}
