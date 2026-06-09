// Zalo OA API v2 — gửi tin nhắn Customer Service
// Docs: https://developers.zalo.me/docs/api/official-account-api/message

const ZALO_API_BASE = 'https://openapi.zalo.me/v2.0/oa'

export interface ZaloTextMessage {
  recipient: { user_id: string }
  message:   { text: string }
}

export interface ZaloApiResponse {
  error:   number   // 0 = success
  message: string
  data?:   { message_id?: string }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = process.env.ZALO_OA_ACCESS_TOKEN
  if (!token) {
    console.warn('[Zalo Client] ZALO_OA_ACCESS_TOKEN chưa cấu hình — bỏ qua gửi tin')
    return { error: -1, message: 'token_missing' } as T
  }

  const res = await fetch(`${ZALO_API_BASE}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': token,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`[Zalo API] HTTP ${res.status} — ${await res.text()}`)
  }
  return res.json() as Promise<T>
}

// Gửi tin nhắn văn bản tới user (customer service message)
export async function sendZaloText(userId: string, text: string): Promise<ZaloApiResponse> {
  try {
    return await post<ZaloApiResponse>('/message/cs', {
      recipient: { user_id: userId },
      message:   { text },
    })
  } catch (err) {
    console.error('[Zalo Client] sendZaloText thất bại:', err)
    return { error: -1, message: err instanceof Error ? err.message : 'unknown' }
  }
}

// Gửi tin nhắn với nút bấm (quick replies)
export async function sendZaloWithButtons(
  userId:  string,
  text:    string,
  buttons: Array<{ title: string; payload: string }>,
): Promise<ZaloApiResponse> {
  try {
    return await post<ZaloApiResponse>('/message/cs', {
      recipient: { user_id: userId },
      message: {
        text,
        quick_replies: buttons.map(b => ({
          content_type: 'text',
          title:        b.title,
          payload:      b.payload,
        })),
      },
    })
  } catch (err) {
    console.error('[Zalo Client] sendZaloWithButtons thất bại:', err)
    return { error: -1, message: err instanceof Error ? err.message : 'unknown' }
  }
}
