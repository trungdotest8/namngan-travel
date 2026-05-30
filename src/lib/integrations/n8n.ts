import type { N8nPayload } from '@/types'

export async function triggerN8n(
  event: N8nPayload['event'],
  data: Record<string, unknown>
): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      data,
      secret: process.env.WEBHOOK_SECRET,
    }),
  })
}
