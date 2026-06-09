import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import { deriveCountry } from '@/lib/tour-country'
import type { TourScheduleStatus } from '@/types'

// ── Internal types ────────────────────────────────────────────────────────────

interface TrieuHaoRecord {
  Id: number
  TourId: number
  TourShow: string
  SoCho: number
  ThoiGian: string
  HangBay: string | null
  ConLai: string | number
  MaLichTour: string
  Tool?: string
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
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) throw new Error(`Cannot parse date: ${s}`)
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

// ThoiGian: "DD/MM/YYYY - DD/MM/YYYY" (or single date)
function parseThoiGian(raw: string): { departureDate: string; returnDate: string } {
  const parts = raw.split(/\s+-\s+/).map(s => s.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { departureDate: parseDMY(parts[0]), returnDate: parseDMY(parts[parts.length - 1]) }
  }
  if (parts.length === 1) {
    const d = parseDMY(parts[0])
    return { departureDate: d, returnDate: d }
  }
  throw new Error(`Cannot parse ThoiGian: ${raw}`)
}

// ConLai có thể là chuỗi "1.500.000" hoặc number
function parsePrice(val: string | number): number {
  if (typeof val === 'number') return val
  const digits = String(val).replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : 0
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

  // Bước 3 — normalize
  const normalized: NormalizedRow[] = []
  for (const r of allRaw) {
    try {
      const { departureDate, returnDate } = parseThoiGian(r.ThoiGian)
      const priceAdult  = parsePrice(r.ConLai)
      const priceChild  = Math.round(priceAdult * 0.75)
      const tourName    = r.TourShow.trim()
      const derived     = deriveCountry(tourName)
      const country     = derived !== 'Khác' ? derived : null
      const tourSlug    = slugify(tourName)
      const transport   = r.HangBay?.trim() || null

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
        seatsTotal:     r.SoCho ?? 0,
        transport,
        externalId:     `TH-${r.MaLichTour}`,
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
