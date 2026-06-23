// Zalo multi-account gateway — lookup token từ bảng zalo_accounts
// Dùng khi hệ thống cần gửi tin với token của một OA cụ thể

import { createAdminClient } from '@/lib/supabase/admin'
import type { ZaloAccount } from '@/types/omnichannel.types'
import type { ZaloApiResponse } from '@/lib/zalo/client'

const ZALO_API_BASE = 'https://openapi.zalo.me/v2.0/oa'

// Tìm ZaloAccount theo oa_id (app_id từ Zalo webhook event)
export async function getZaloAccountByOaId(oaId: string): Promise<ZaloAccount | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('zalo_accounts')
    .select('*')
    .eq('oa_id', oaId)
    .eq('is_active', true)
    .maybeSingle()
  return (data as ZaloAccount | null) ?? null
}

// Tìm ZaloAccount đầu tiên đang active (fallback khi không có oa_id)
export async function getDefaultZaloAccount(): Promise<ZaloAccount | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('zalo_accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return (data as ZaloAccount | null) ?? null
}

// Tìm ZaloAccount theo id (UUID)
export async function getZaloAccountById(id: string): Promise<ZaloAccount | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('zalo_accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as ZaloAccount | null) ?? null
}

// Gửi tin nhắn văn bản với token cụ thể (dùng cho multi-account)
export async function sendZaloTextWithToken(
  userId: string,
  text: string,
  accessToken: string,
): Promise<ZaloApiResponse> {
  try {
    const res = await fetch(`${ZALO_API_BASE}/message/cs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': accessToken,
      },
      body: JSON.stringify({
        recipient: { user_id: userId },
        message:   { text },
      }),
    })
    if (!res.ok) {
      throw new Error(`Zalo API HTTP ${res.status}: ${await res.text()}`)
    }
    return res.json() as Promise<ZaloApiResponse>
  } catch (err) {
    console.error('[Zalo Multi-Account] sendZaloTextWithToken thất bại:', err)
    return { error: -1, message: err instanceof Error ? err.message : 'unknown' }
  }
}
