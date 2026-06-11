import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_COOKIE } from '@/lib/admin-auth-constants'

// Supabase max 1000 rows per query
const PAGE_SIZE = 1000

const VALID_PLATFORMS = ['facebook', 'tiktok'] as const
const VALID_SOURCES   = ['sms_log', 'lead', 'booking', 'facebook_ads'] as const
type Platform = typeof VALID_PLATFORMS[number]
type Source   = typeof VALID_SOURCES[number]

function sha256hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

/**
 * Facebook: hash "84xxxxxxxxx"   → header "phone"
 * TikTok  : hash "+84xxxxxxxxx"  → header "Phone"
 */
function hashPhone(phone: string, platform: Platform): string {
  const input = platform === 'tiktok' ? '+' + phone : phone
  return sha256hex(input)
}

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  if (!req.cookies.get(ADMIN_COOKIE)?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Query params ────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const platformParam = searchParams.get('platform')
  const sourceParam   = searchParams.get('source')

  if (!platformParam || !(VALID_PLATFORMS as readonly string[]).includes(platformParam)) {
    return NextResponse.json(
      { error: 'Tham số platform phải là "facebook" hoặc "tiktok"' },
      { status: 400 }
    )
  }
  const platform = platformParam as Platform

  if (sourceParam && !(VALID_SOURCES as readonly string[]).includes(sourceParam)) {
    return NextResponse.json(
      { error: `Tham số source không hợp lệ. Cho phép: ${VALID_SOURCES.join(' | ')}` },
      { status: 400 }
    )
  }
  const source = sourceParam as Source | undefined

  // ── Fetch all rows with stable pagination ───────────────────────────────────
  const supabase = createAdminClient()
  const allPhones: string[] = []

  let offset = 0
  while (true) {
    let query = supabase
      .from('audience_contacts')
      .select('phone')
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)

    if (source) query = query.eq('source', source)

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Lỗi truy vấn database: ' + error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) break

    for (const row of data) {
      if (row.phone) allPhones.push(row.phone as string)
    }

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  // ── Hash + deduplicate on RAM ────────────────────────────────────────────────
  const csvHeader = platform === 'facebook' ? 'phone' : 'Phone'
  const seen      = new Set<string>()
  const lines: string[] = [csvHeader]

  for (const phone of allPhones) {
    const hashed = hashPhone(phone, platform)
    if (!seen.has(hashed)) {
      seen.add(hashed)
      lines.push(hashed)
    }
  }

  // ── Stream CSV response ──────────────────────────────────────────────────────
  const csv      = lines.join('\n')
  const filename = `audience_${platform}_${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
