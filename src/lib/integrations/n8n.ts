import type { N8nPayload } from '@/types'

export async function triggerN8n(
  event: N8nPayload['event'],
  data: Record<string, unknown>
): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) return

  // Secret chỉ gửi trong header, không serialize vào body để tránh lộ trong n8n execution log
  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': process.env.WEBHOOK_SECRET ?? '',
    },
    body: JSON.stringify({ event, data }),
  })
}
