import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import { deriveCountry } from '@/lib/tour-country'
import type { TourScheduleStatus } from '@/types'

// ── Internal types ────────────────────────────────────────────────────────────

interface SeaStarDestination {
  id: number
  name: string
  market: { id: number; name: string }
}

interface SeaStarDeparture {
  name: string
  departure_by: { time: string; code: string; time_notes: string }
  return_by: { time: string; code: string }
  prices: { adl_price: number; chd_price: number }
  seats: { total_free_seats: number; total_reserved_seats: number }
}

interface SeaStarFilterResponse {
  data?: {
    destinations?: SeaStarDestination[]
  }
}

interface SeaStarDeparturesResponse {
  success: boolean
  data?: SeaStarDeparture[]
}

interface RawSchedule {
  destId: number
  destName: string
  tourName: string
  departureDate: string
  returnDate: string
  priceAdult: number
  priceChild: number
  seatsTotal: number
  seatsFree: number
  transport: string | null
  externalId: string
  tourExternalId: string
  tourSlug: string
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface SeaStarScheduleItem {
  ma_tour: string
  ten_tour: string
  ngay_khoi_hanh: string
  gia: number
  so_cho_trong: number
}

export interface SyncResult {
  items: SeaStarScheduleItem[]
  synced: number
  skipped: number
  errors: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_URL = 'https://lich.seastartravel.vn'

function parseDDMMYYYY(dateStr: string): string {
  const parts = dateStr.split('/')
  if (parts.length !== 3 || parts.some(p => !p)) {
    throw new Error(`Invalid date format: ${dateStr}`)
  }
  const [dd, mm, yyyy] = parts
  return `${yyyy}-${mm}-${dd}`
}

// djb2 hash → stable 6-char base36 string
function nameHash(name: string): string {
  let hash = 5381
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) + hash) ^ name.charCodeAt(i)
  }
  return Math.abs(hash).toString(36).slice(0, 6)
}

function getMonths(count: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    months.push(`${d.getFullYear()}-${mm}`)
  }
  return months
}

async function fetchWithBrowserHeaders(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://lich.seastartravel.vn/',
    },
  })
  if (!res.ok) throw new Error(`SeaStar API ${res.status}: ${url}`)
  return res
}

// transport: code chứa 2+ chữ cái in hoa liên tiếp → chuyến bay
function inferTransport(code: string): string | null {
  return /[A-Z]{2}/.test(code) ? 'máy bay' : null
}

function toSeaStarItems(raw: RawSchedule[]): SeaStarScheduleItem[] {
  return raw.map(r => ({
    ma_tour: `SS-${r.destId}`,
    ten_tour: r.tourName,
    ngay_khoi_hanh: r.departureDate,
    gia: r.priceAdult,
    so_cho_trong: r.seatsFree,
  }))
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function syncSeaStarSchedules(): Promise<SyncResult> {
  const errors: string[] = []
  let synced = 0
  let skipped = 0

  // Bước 1 — Fetch destinations
  let destinations: SeaStarDestination[] = []
  try {
    const res = await fetchWithBrowserHeaders(`${BASE_URL}/api/filter.php`)
    const json: SeaStarFilterResponse = await res.json()
    destinations = json.data?.destinations ?? []
    if (destinations.length === 0) {
      return { items: [], synced: 0, skipped: 0, errors: ['Không có destinations từ SeaStar API'] }
    }
  } catch (err) {
    return { items: [], synced: 0, skipped: 0, errors: [`filter API thất bại: ${err}`] }
  }

  // Bước 2 — Fetch departures song song cho tất cả dest × 6 tháng (tháng hiện tại → +5)
  const months = getMonths(6)
  type Task = { dest: SeaStarDestination; month: string }
  const tasks: Task[] = destinations.flatMap(dest =>
    months.map(month => ({ dest, month }))
  )

  const settled = await Promise.allSettled(
    tasks.map(({ dest, month }) =>
      fetchWithBrowserHeaders(
        `${BASE_URL}/api/departures.php?dest_id=${dest.id}&month=${month}`
      ).then(r => r.json() as Promise<SeaStarDeparturesResponse>)
    )
  )

  // Bước 3 — Normalize sang RawSchedule[]
  const raw: RawSchedule[] = []

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]
    const { dest, month } = tasks[i]

    if (result.status === 'rejected') {
      errors.push(`${dest.name} ${month}: ${result.reason}`)
      continue
    }

    const json = result.value
    if (!json.success || !json.data?.length) {
      skipped++
      continue
    }

    for (const dep of json.data) {
      try {
        const departureDate = parseDDMMYYYY(dep.departure_by.time)
        const returnDate = parseDDMMYYYY(dep.return_by.time)
        const seatsFree = dep.seats.total_free_seats ?? 0
        const seatsReserved = dep.seats.total_reserved_seats ?? 0
        const tourSlugBase = slugify(dep.name)
        const tourExtId = `seastartravel:${dest.id}:${tourSlugBase}`
        const scheduleExtId = `SS-${dest.id}-${departureDate.replace(/-/g, '')}-${nameHash(dep.name)}`

        raw.push({
          destId: dest.id,
          destName: dest.name,
          tourName: dep.name,
          departureDate,
          returnDate,
          priceAdult: dep.prices.adl_price,
          priceChild: dep.prices.chd_price,
          seatsTotal: seatsFree + seatsReserved,
          seatsFree,
          transport: inferTransport(dep.departure_by.code),
          externalId: scheduleExtId,
          tourExternalId: tourExtId,
          tourSlug: tourSlugBase,
        })
      } catch (err) {
        errors.push(`normalize ${dest.name} "${dep.name}": ${err}`)
      }
    }
  }

  if (raw.length === 0) {
    return { items: toSeaStarItems(raw), synced: 0, skipped, errors }
  }

  const supabase = createAdminClient()

  // Bước 4 — Upsert tours (dedup by tourExternalId)
  const uniqueTours = [...new Map(raw.map(r => [r.tourExternalId, r])).values()]

  for (const r of uniqueTours) {
    try {
      // Kiểm tra đã tồn tại theo sheets_row_id
      const { data: existing } = await supabase
        .from('tours')
        .select('id')
        .eq('sheets_row_id', r.tourExternalId)
        .maybeSingle()

      const derivedCountry = deriveCountry(r.destName)
      const countryValue = derivedCountry !== 'Khác' ? derivedCountry : null

      if (existing) {
        await supabase
          .from('tours')
          .update({ synced_at: new Date().toISOString(), country: countryValue })
          .eq('id', existing.id)
          .is('country', null)   // chỉ cập nhật nếu chưa có country
        await supabase
          .from('tours')
          .update({ synced_at: new Date().toISOString() })
          .eq('id', existing.id)
        continue
      }

      // Kiểm tra trùng tên (tour từ nguồn khác)
      const { data: byName } = await supabase
        .from('tours')
        .select('id')
        .eq('name', r.tourName)
        .maybeSingle()

      if (byName) {
        await supabase
          .from('tours')
          .update({ sheets_row_id: r.tourExternalId, synced_at: new Date().toISOString(), country: countryValue })
          .eq('id', byName.id)
        continue
      }

      // Tạo mới — code unique per (destId + tourSlugBase) để tránh UNIQUE conflict
      // khi một dest có nhiều tên tour khác nhau
      const tourCode = `SS-${r.destId}-${nameHash(r.tourName)}`
      await supabase.from('tours').insert({
        code: tourCode,
        name: r.tourName,
        slug: `${r.tourSlug}-ss-${r.destId}-${nameHash(r.tourName)}`,
        destination: r.destName,
        category: 'nước ngoài',
        country: countryValue,
        is_active: true,
        sheets_row_id: r.tourExternalId,
        synced_at: new Date().toISOString(),
      })
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err)
      errors.push(`tour upsert ${r.tourExternalId}: ${msg}`)
    }
  }

  // Bước 5 — Upsert tour_schedules
  const { data: tourRows } = await supabase
    .from('tours')
    .select('id, sheets_row_id')
    .like('sheets_row_id', 'seastartravel:%')

  const tourIdMap = new Map(
    (tourRows ?? [])
      .filter((t): t is { id: string; sheets_row_id: string } => t.sheets_row_id !== null)
      .map(t => [t.sheets_row_id, t.id])
  )

  for (const r of raw) {
    const tourId = tourIdMap.get(r.tourExternalId)
    if (!tourId) {
      skipped++
      continue
    }

    const status: TourScheduleStatus = r.seatsFree === 0 ? 'full' : 'open'
    const payload = {
      tour_id: tourId,
      departure_date: r.departureDate,
      return_date: r.returnDate,
      price_adult: r.priceAdult,
      price_child: r.priceChild,
      seats_total: r.seatsTotal,
      seats_booked: r.seatsTotal - r.seatsFree,
      transport: r.transport,
      status,
      sheets_row_id: r.externalId,
      synced_at: new Date().toISOString(),
    }

    try {
      // Manual upsert: không phụ thuộc unique index (migration #5 tăng performance nhưng không bắt buộc)
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

  return { items: toSeaStarItems(raw), synced, skipped, errors }
}
