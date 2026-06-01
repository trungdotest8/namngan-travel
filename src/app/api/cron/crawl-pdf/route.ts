import { NextResponse } from 'next/server'

// Vercel Cron: chạy hàng ngày lúc 2:00 AM UTC
// Schedule khai báo trong vercel.json → crons[].path = "/api/cron/crawl-pdf"
//
// Auth (2 cách):
//   - Vercel Cron tự inject: Authorization: Bearer {CRON_SECRET}
//   - Trigger thủ công:      x-webhook-secret: {WEBHOOK_SECRET}
//
// Env cần set:
//   CRON_SECRET        ← Vercel auto-inject khi cron chạy
//   WEBHOOK_SECRET     ← dùng để gọi tay qua curl
//   N8N_WEBHOOK_URL    ← URL n8n workflow trigger crawlAndIndexTourPDF.js

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader   = request.headers.get('authorization')
  const manualSecret = request.headers.get('x-webhook-secret')

  const isVercelCron    = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isManualTrigger = !!process.env.WEBHOOK_SECRET && manualSecret === process.env.WEBHOOK_SECRET

  if (!isVercelCron && !isManualTrigger) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const at = new Date().toISOString()

  if (!process.env.N8N_WEBHOOK_URL) {
    console.warn('[cron/crawl-pdf] N8N_WEBHOOK_URL chưa set — crawler không được trigger')
    return NextResponse.json(
      { ok: false, via: null, reason: 'N8N_WEBHOOK_URL not configured', at },
      { status: 503 },
    )
  }

  try {
    const res = await fetch(process.env.N8N_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'crawl-pdf', triggered_at: at }),
    })

    if (!res.ok) {
      throw new Error(`n8n trả về ${res.status}`)
    }

    console.log(`[cron/crawl-pdf] trigger thành công via n8n — ${at}`)
    return NextResponse.json({ ok: true, via: 'n8n', at })
  } catch (err) {
    console.error('[cron/crawl-pdf] n8n trigger thất bại:', err)
    return NextResponse.json(
      { ok: false, via: 'n8n', error: String(err), at },
      { status: 502 },
    )
  }
}
