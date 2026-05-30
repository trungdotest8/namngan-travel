import { createClient } from '@supabase/supabase-js'

// Chỉ dùng trong API routes server-side — KHÔNG expose ra client
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
