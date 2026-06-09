import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import { deriveCountry } from '@/lib/tour-country'
import type { TourScheduleStatus } from '@/types'

// ── Internal types ────────────────────────────────────────────────────────────
// Note: ALL fields from the API are HTML strings, not plain text

interface TrieuHaoRecord {
  Id: number
  TourId: number
  TourShow: string    // HTML — tour name in data-original-title
  SoCho: string       // HTML — seat counts in <b> tags
  ThoiGian: string    // HTML — dates in <b> tags
  HangBay: string | null // HTML — airline/flight info
  ConLai: string      // HTML — price in <span>
  MaLichTour: string  // HTML — tour code in <strong>
  Tool?: string
  IsYeuThich?: boolean
}

interface TrieuHaoResponse {
  iTotalDisplayRecords: number
  iTotalRecords?: number
  aaData: TrieuHaoRecord[]
  sEcho?: number
}

// ── Public type ───────────────────────────────────────────────────────────────

export interface TrieuHaoSyncResult {
  synced: number
  skipped: number
  errors: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_URL   = 'https://trieuhaotravel.vn'
const API_URL    = `${BASE_URL}/DieuHanhTour/DatCho/Lists`
const PORTAL_URL = `${BASE_URL}/DieuHanhTour/DatCho`

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Date range: từ đầu tháng hiện tại → +6 tháng
function getDateRange(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 6, 0)
  const fmt   = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  return `${fmt(start)} - ${fmt(end)}`
}

// Lấy session cookie từ env TRIEUHAO_SESSION_COOKIE
// (đăng nhập thủ công bằng Google OAuth, copy cookie từ DevTools)
function getSessionCookie(): string {
  const cookie = process.env.TRIEUHAO_SESSION_COOKIE ?? ''
  if (!cookie) throw new Error(
    'Thiếu TRIEUHAO_SESSION_COOKIE trong env. ' +
    'Đăng nhập vào trieuhaotravel.vn/DieuHanhTour/DatCho bằng Google, ' +
    'mở DevTools → Application → Cookies → copy .ASPXAUTH và ASP.NET_SessionId'
  )
  return cookie
}

// "DD/MM/YYYY" → "YYYY-MM-DD"
function parseDMY(s: string): string {
  const m = s.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) throw new Error(`Cannot parse date: ${s}`)
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

// Strip HTML tags, decode basic HTML entities
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/\s+/g, ' ').trim()
}

// TourShow HTML → tour name (from data-original-title attribute)
function parseTourName(html: string): string {
  const m = html.match(/data-original-title="([^"]+)"/)
  if (m) return m[1].trim()
  // fallback: strip HTML and take first meaningful segment
  return stripHtml(html).split(/\s{2,}/)[0] ?? 'Unknown'
}

// ThoiGian HTML → departure + return dates
// Format: <b>09/06/2026</b> ... <b>13/06/2026</b>
function parseThoiGian(html: string): { departureDate: string; returnDate: string } {
  const dates = [...html.matchAll(/<b>(\d{2}\/\d{2}\/\d{4})<\/b>/g)].map(m => parseDMY(m[1]))
  if (dates.length >= 2) return { departureDate: dates[0], returnDate: dates[dates.length - 1] }
  if (dates.length === 1) return { departureDate: dates[0], returnDate: dates[0] }
  // fallback: try data-original-title="DD/MM/YYYY HH:mm"
  const titles = [...html.matchAll(/data-original-title="(\d{2}\/\d{2}\/\d{4})/g)].map(m => parseDMY(m[1]))
  if (titles.length >= 2) return { departureDate: titles[0], returnDate: titles[titles.length - 1] }
  if (titles.length === 1) return { departureDate: titles[0], returnDate: titles[0] }
  throw new Error(`Cannot parse ThoiGian: ${html.slice(0, 100)}`)
}

// ConLai HTML → price number
// Format: <span ...>18,990,000</span>
function parsePrice(html: string): number {
  const m = html.match(/<span[^>]*>([\d,\.]+)<\/span>/)
  if (m) {
    const digits = m[1].replace(/[,\.]/g, '')
    return digits ? parseInt(digits, 10) : 0
  }
  // fallback: extract any number sequence
  const digits = stripHtml(html).replace(/[,\.]/g, '').match(/\d+/)
  return digits ? parseInt(digits[0], 10) : 0
}

// SoCho HTML → { total, remaining }
// "Số chỗ: <b>20</b>" / "Còn: <b>0</b> chỗ"
function parseSeats(html: string): { total: number; remaining: number } {
  const totalM  = html.match(/Số chỗ[^<]*<b>(\d+)<\/b>/)
  const remainM = html.match(/Còn[^<]*<b>(\d+)<\/b>/)
  return {
    total:     totalM  ? parseInt(totalM[1],  10) : 0,
    remaining: remainM ? parseInt(remainM[1], 10) : 0,
  }
}

// MaLichTour HTML → tour code string (e.g. "TQ090626LG5")
function parseMaLichTour(html: string): string {
  const m = html.match(/Mã Lich[^<]*<strong>([^<]+)<\/strong>/)
            ?? html.match(/Mã Lịch[^<]*<strong>([^<]+)<\/strong>/)
            ?? html.match(/<strong>([A-Z0-9]+)<\/strong>/)
  return m?.[1]?.trim() ?? ''
}

// HangBay HTML → flight summary string
function parseHangBay(html: string | null): string | null {
  if (!html) return null
  // Extract first flight code from <b> tag, e.g. "DR5052 SGN-LJG 1405 - 1835"
  const m = html.match(/<b>([^<]+)<\/b>/)
  return m ? m[1].trim() : null
}

async function fetchPage(dateRange: string, start: number, cookie: string): Promise<TrieuHaoResponse> {
  const body = new URLSearchParams({
    Ngay:            dateRange,
    NoiXuatPhatId:   '1',
    IsNgay:          'true',
    IsConCho:        'false',
    iDisplayStart:   String(start),
    iDisplayLength:  '500',
    sEcho:           '1',
  })

  const headers: Record<string, string> = {
    'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer':          PORTAL_URL,
    'Origin':           BASE_URL,
    'Accept':           'application/json, text/javascript, */*; q=0.01',
    'Accept-Language':  'vi-VN,vi;q=0.9,en;q=0.8',
  }
  if (cookie) headers['Cookie'] = cookie

  const res = await fetch(API_URL, { method: 'POST', headers, body: body.toString() })

  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch (_) { /* ignore */ }
    throw new Error(`TrieuHao API ${res.status}${detail ? ` — ${detail.slice(0, 300)}` : ''}`)
  }

  const text = await res.text()
  // Nếu server trả về HTML (redirect về trang chủ) thay vì JSON
  if (text.trimStart().startsWith('<')) {
    throw new Error(`TrieuHao trả về HTML (session hết hạn hoặc endpoint thay đổi): ${text.slice(0, 200)}`)
  }
  try {
    return JSON.parse(text) as TrieuHaoResponse
  } catch (_) {
    throw new Error(`TrieuHao không phải JSON: ${text.slice(0, 200)}`)
  }
}

// ── Normalized row ────────────────────────────────────────────────────────────

interface NormalizedRow {
  tourId:          number
  tourName:        string
  tourExternalId:  string
  tourSlug:        string
  country:         string | null
  departureDate:   string
  returnDate:      string
  priceAdult:      number
  priceChild:      number
  seatsTotal:      number
  transport:       string | null
  externalId:      string
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function syncTrieuHaoSchedules(): Promise<TrieuHaoSyncResult> {
  const errors: string[] = []
  let synced  = 0
  let skipped = 0

  const dateRange = getDateRange()

  // Bước 0 — lấy session cookie từ env
  let cookie: string
  try {
    cookie = getSessionCookie()
  } catch (err) {
    return { synced: 0, skipped: 0, errors: [`${err}`] }
  }

  // Bước 1 — trang đầu để lấy total
  let first: TrieuHaoResponse
  try {
    first = await fetchPage(dateRange, 0, cookie)
  } catch (err) {
    return { synced: 0, skipped: 0, errors: [`TrieuHao API lỗi: ${err}`] }
  }

  const allRaw: TrieuHaoRecord[] = [...first.aaData]
  const total     = first.iTotalDisplayRecords
  const pageSize  = 500
  const pageCount = Math.ceil(total / pageSize)

  // Bước 2 — các trang còn lại (song song)
  if (pageCount > 1) {
    const rest = await Promise.allSettled(
      Array.from({ length: pageCount - 1 }, (_, i) =>
        fetchPage(dateRange, (i + 1) * pageSize, cookie)
      )
    )
    for (const r of rest) {
      if (r.status === 'fulfilled') allRaw.push(...r.value.aaData)
      else errors.push(`Trang phụ lỗi: ${r.reason}`)
    }
  }

  if (allRaw.length === 0) {
    return { synced: 0, skipped: 0, errors: ['Không có dữ liệu từ TrieuHao API'] }
  }

  // Bước 3 — normalize (all fields are HTML, use dedicated parsers)
  const normalized: NormalizedRow[] = []
  for (const r of allRaw) {
    try {
      const { departureDate, returnDate } = parseThoiGian(r.ThoiGian)
      const priceAdult  = parsePrice(r.ConLai)
      const priceChild  = Math.round(priceAdult * 0.75)
      const { total: seatsTotal } = parseSeats(r.SoCho)
      const tourName    = parseTourName(r.TourShow)
      const maLichTour  = parseMaLichTour(r.MaLichTour)
      const transport   = parseHangBay(r.HangBay ?? null)
      const derived     = deriveCountry(tourName)
      const country     = derived !== 'Khác' ? derived : null
      const tourSlug    = slugify(tourName)

      // Dùng MaLichTour từ HTML nếu có, fallback về Id
      const externalId = maLichTour ? `TH-${maLichTour}` : `TH-ID${r.Id}`

      normalized.push({
        tourId:         r.TourId,
        tourName,
        tourExternalId: `trieuhao:${r.TourId}`,
        tourSlug,
        country,
        departureDate,
        returnDate,
        priceAdult,
        priceChild,
        seatsTotal,
        transport,
        externalId,
      })
    } catch (err) {
      errors.push(`normalize TourId=${r.TourId}: ${err}`)
    }
  }

  if (normalized.length === 0) {
    return { synced: 0, skipped, errors }
  }

  const supabase = createAdminClient()

  // Bước 4 — upsert tours (dedup by tourExternalId)
  const uniqueTours = [...new Map(normalized.map(r => [r.tourExternalId, r])).values()]

  for (const r of uniqueTours) {
    try {
      const { data: existing } = await supabase
        .from('tours')
        .select('id')
        .eq('sheets_row_id', r.tourExternalId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('tours')
          .update({ synced_at: new Date().toISOString() })
          .eq('id', existing.id)
        continue
      }

      const { data: byName } = await supabase
        .from('tours')
        .select('id')
        .eq('name', r.tourName)
        .maybeSingle()

      if (byName) {
        await supabase
          .from('tours')
          .update({ sheets_row_id: r.tourExternalId, synced_at: new Date().toISOString(), country: r.country })
          .eq('id', byName.id)
        continue
      }

      await supabase.from('tours').insert({
        code:          `TH-${r.tourId}`,
        name:          r.tourName,
        slug:          `${r.tourSlug}-th-${r.tourId}`,
        destination:   r.tourName,
        category:      'nước ngoài',
        country:       r.country,
        is_active:     true,
        sheets_row_id: r.tourExternalId,
        synced_at:     new Date().toISOString(),
      })
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err)
      errors.push(`tour upsert ${r.tourExternalId}: ${msg}`)
    }
  }

  // Bước 5 — upsert tour_schedules
  const { data: tourRows } = await supabase
    .from('tours')
    .select('id, sheets_row_id')
    .like('sheets_row_id', 'trieuhao:%')

  const tourIdMap = new Map(
    (tourRows ?? [])
      .filter((t): t is { id: string; sheets_row_id: string } => t.sheets_row_id !== null)
      .map(t => [t.sheets_row_id, t.id])
  )

  for (const r of normalized) {
    const tourId = tourIdMap.get(r.tourExternalId)
    if (!tourId) { skipped++; continue }

    const status: TourScheduleStatus = r.seatsTotal === 0 ? 'full' : 'open'
    const payload = {
      tour_id:        tourId,
      departure_date: r.departureDate,
      return_date:    r.returnDate,
      price_adult:    r.priceAdult,
      price_child:    r.priceChild,
      seats_total:    r.seatsTotal,
      seats_booked:   0,
      transport:      r.transport,
      status,
      sheets_row_id:  r.externalId,
      synced_at:      new Date().toISOString(),
    }

    try {
      const { data: existing } = await supabase
        .from('tour_schedules')
        .select('id')
        .eq('sheets_row_id', r.externalId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('tour_schedules')
          .update(payload)
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('tour_schedules')
          .insert(payload)
        if (error) throw error
      }
      synced++
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err)
      errors.push(`schedule upsert ${r.externalId}: ${msg}`)
      skipped++
    }
  }

  return { synced, skipped, errors }
}
