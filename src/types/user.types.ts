export interface User {
  id:            string
  auth_id:       string | null    // Supabase auth.users.id
  full_name:     string
  phone:         string | null
  email:         string | null
  avatar_url:    string | null
  date_of_birth: string | null    // "YYYY-MM-DD"
  gender:        UserGender | null
  address:       string | null
  role:          UserRole
  is_active:     boolean
  created_at:    string
  updated_at:    string
}

export type UserRole   = 'member' | 'staff' | 'admin'
export type UserGender = 'male' | 'female' | 'other'

export interface Wallet {
  id:         string
  user_id:    string
  balance:    number              // VND, luôn >= 0
  updated_at: string
}

export type WalletTransactionType = 'deposit' | 'withdrawal' | 'refund' | 'payment' | 'bonus'

export interface WalletTransaction {
  id:             string
  wallet_id:      string
  booking_id:     string | null
  type:           WalletTransactionType
  amount:         number          // luôn dương
  balance_before: number
  balance_after:  number
  note:           string | null
  created_by:     string | null
  created_at:     string
}
