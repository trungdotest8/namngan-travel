#!/usr/bin/env node
/**
 * sync-trieuhao.mjs — Chạy trên máy local (IP Việt Nam)
 * Fetch lịch trình từ trieuhaotravel.vn rồi POST về Vercel API để lưu DB.
 *
 * Usage:
 *   node scripts/sync-trieuhao.mjs
 *   node scripts/sync-trieuhao.mjs --url https://namngan-travel.vercel.app
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Config ────────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 0) continue
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
    return env
  } catch { return {} }
}

const env      = loadEnv()
const COOKIE   = env.TRIEUHAO_SESSION_COOKIE ?? process.env.TRIEUHAO_SESSION_COOKIE ?? ''
const SECRET   = env.WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET ?? ''
const urlFlagIdx = process.argv.indexOf('--url')
const BASE_URL = process.argv.find(a => a.startsWith('--url='))?.slice(6)
              ?? (urlFlagIdx >= 0 ? process.argv[urlFlagIdx + 1] : undefined)
              ?? env.NEXT_PUBLIC_SITE_URL
              ?? 'http://localhost:3000'

if (!COOKIE) { console.error('❌  Thiếu TRIEUHAO_SESSION_COOKIE trong .env.local'); process.exit(1) }
if (!SECRET) { console.error('❌  Thiếu WEBHOOK_SECRET trong .env.local'); process.exit(1) }

// ── TrieuHao fetch ────────────────────────────────────────────────────────────

const API_URL    = 'https://trieuhaotravel.vn/DieuHanhTour/DatCho/Lists'
const PORTAL_URL = 'https://trieuhaotravel.vn/DieuHanhTour/DatCho'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function getDateRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 6, 0)
  const fmt   = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  return `${fmt(start)} - ${fmt(end)}`
}

async function fetchPage(dateRange, start) {
  const body = new URLSearchParams({
    Ngay: dateRange, NoiXuatPhatId: '1', IsNgay: 'true',
    IsConCho: 'false', iDisplayStart: String(start), iDisplayLength: '500', sEcho: '1',
  })
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': UA,
      'Referer': PORTAL_URL,
      'Origin': 'https://trieuhaotravel.vn',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Cookie': COOKIE,
    },
    body: body.toString(),
  })
  const text = await res.text()
  if (!res.ok || text.trimStart().startsWith('<')) {
    throw new Error(`Session hết hạn hoặc cookie không hợp lệ (HTTP ${res.status}). Vào trieuhaotravel.vn, đăng nhập lại, copy cookie mới vào TRIEUHAO_SESSION_COOKIE trong .env.local`)
  }
  return JSON.parse(text)
}

// ── HTML parsers ──────────────────────────────────────────────────────────────

function parseTourName(html) {
  const m = html.match(/data-original-title="([^"]+)"/)
  return m ? m[1].trim() : html.replace(/<[^>]+>/g,' ').trim().slice(0,100)
}
function parseDMY(s) {
  const m = s.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) throw new Error(`Cannot parse date: ${s}`)
  return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
}
function parseThoiGian(html) {
  const dates = [...html.matchAll(/<b>(\d{2}\/\d{2}\/\d{4})<\/b>/g)].map(m => parseDMY(m[1]))
  if (dates.length >= 2) return { departureDate: dates[0], returnDate: dates[dates.length-1] }
  if (dates.length === 1) return { departureDate: dates[0], returnDate: dates[0] }
  const titles = [...html.matchAll(/data-original-title="(\d{2}\/\d{2}\/\d{4})/g)].map(m => parseDMY(m[1]))
  if (titles.length >= 2) return { departureDate: titles[0], returnDate: titles[titles.length-1] }
  if (titles.length === 1) return { departureDate: titles[0], returnDate: titles[0] }
  throw new Error(`Cannot parse ThoiGian`)
}
function parsePrice(html) {
  const m = html.match(/<span[^>]*>([\d,\.]+)<\/span>/)
  return m ? parseInt(m[1].replace(/[,.]/g,''), 10) : 0
}
function parseSeats(html) {
  const m = html.match(/Số chỗ[^<]*<b>(\d+)<\/b>/)
  return m ? parseInt(m[1], 10) : 0
}
function parseMaLichTour(html) {
  const m = html.match(/Mã Lic[^<]*<strong>([^<]+)<\/strong>/)
            ?? html.match(/<strong>([A-Z0-9]+)<\/strong>/)
  return m?.[1]?.trim() ?? ''
}
function parseHangBay(html) {
  if (!html) return null
  const m = html.match(/<b>([^<]+)<\/b>/)
  return m ? m[1].trim() : null
}

// ── Slugify + deriveCountry (simple version) ──────────────────────────────────

function slugify(str) {
  return str.toLowerCase()
    .replace(/[àáảãạăắặẳẵằâấầẩẫậ]/g,'a').replace(/[èéẻẽẹêếềểễệ]/g,'e')
    .replace(/[ìíỉĩị]/g,'i').replace(/[òóỏõọôốồổỗộơớờởỡợ]/g,'o')
    .replace(/[ùúủũụưứừửữự]/g,'u').replace(/[ýỳỷỹỵ]/g,'y').replace(/đ/g,'d')
    .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,80)
}

const COUNTRY_KEYWORDS = {
  'Nhật Bản': ['nhật bản','japan','nhat ban'],
  'Trung Quốc': ['trung quốc','china','trung quoc','lệ giang','đại lý','shangrila','côn minh','tây tạng','thượng hải','bắc kinh'],
  'Hàn Quốc': ['hàn quốc','korea','han quoc','seoul','busan'],
  'Thái Lan': ['thái lan','thailand','thai lan','bangkok','phuket'],
  'Singapore': ['singapore'],
  'Malaysia': ['malaysia','kuala lumpur'],
  'Indonesia': ['indonesia','bali'],
  'Việt Nam': ['việt nam','vietnam','hà nội','hồ chí minh','đà nẵng','phú quốc','nha trang','hội an','sapa'],
  'Anh': ['anh','england','scotland','wales','london','edinburgh'],
  'Pháp': ['pháp','france','paris'],
  'Ý': ['ý','italy','roma','venice'],
  'Đức': ['đức','germany','berlin'],
  'Thụy Điển': ['thụy điển','sweden'],
  'Phần Lan': ['phần lan','finland'],
  'Na Uy': ['na uy','norway'],
  'Đan Mạch': ['đan mạch','denmark'],
  'Úc': ['úc','australia','sydney','melbourne'],
  'Mỹ': ['mỹ','usa','america','new york','los angeles'],
}

function deriveCountry(name) {
  const lower = name.toLowerCase()
  for (const [country, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return country
  }
  return 'Khác'
}

// ── Normalize ─────────────────────────────────────────────────────────────────

function normalize(records) {
  const normalized = []
  const errors = []
  for (const r of records) {
    try {
      const { departureDate, returnDate } = parseThoiGian(r.ThoiGian)
      const priceAdult  = parsePrice(r.ConLai)
      const maLichTour  = parseMaLichTour(r.MaLichTour)
      const tourName    = parseTourName(r.TourShow)
      const derived     = deriveCountry(tourName)
      normalized.push({
        tourId:         r.TourId,
        tourName,
        tourExternalId: `trieuhao:${r.TourId}`,
        tourSlug:       slugify(tourName),
        country:        derived !== 'Khác' ? derived : null,
        departureDate,
        returnDate,
        priceAdult,
        priceChild:     Math.round(priceAdult * 0.75),
        seatsTotal:     parseSeats(r.SoCho),
        transport:      parseHangBay(r.HangBay ?? null),
        externalId:     maLichTour ? `TH-${maLichTour}` : `TH-ID${r.Id}`,
      })
    } catch (err) {
      errors.push(`TourId=${r.TourId}: ${err.message}`)
    }
  }
  return { normalized, errors }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🚀  TrieuHao Sync — ${new Date().toLocaleString('vi-VN')}`)
  console.log(`📡  Target API: ${BASE_URL}`)

  const dateRange = getDateRange()
  console.log(`📅  Date range: ${dateRange}`)

  // Fetch trang đầu
  console.log('⏳  Fetching page 1...')
  const first = await fetchPage(dateRange, 0)
  const total = first.iTotalDisplayRecords
  console.log(`✅  Total records: ${total}`)

  const allRaw = [...first.aaData]
  const pageCount = Math.ceil(total / 500)

  // Fetch các trang còn lại
  for (let i = 1; i < pageCount; i++) {
    console.log(`⏳  Fetching page ${i+1}/${pageCount}...`)
    const page = await fetchPage(dateRange, i * 500)
    allRaw.push(...page.aaData)
  }
  console.log(`📦  Raw records fetched: ${allRaw.length}`)

  // Normalize
  const { normalized, errors: parseErrors } = normalize(allRaw)
  console.log(`🔧  Normalized: ${normalized.length} | Parse errors: ${parseErrors.length}`)
  if (parseErrors.length) parseErrors.slice(0,5).forEach(e => console.warn('  ⚠', e))

  // POST về Vercel API
  const ingestUrl = `${BASE_URL}/api/departures/ingest`
  console.log(`📤  Posting to ${ingestUrl}...`)
  const res = await fetch(ingestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': SECRET,
    },
    body: JSON.stringify({ records: normalized }),
  })

  const result = await res.json()
  if (!res.ok) {
    console.error('❌  Ingest failed:', JSON.stringify(result))
    process.exit(1)
  }

  console.log(`\n🎉  Done! synced=${result.synced} skipped=${result.skipped}`)
  if (result.errors?.length) {
    console.warn(`⚠️  ${result.errors.length} errors:`)
    result.errors.slice(0,5).forEach(e => console.warn('  -', e))
  }
}

main().catch(err => { console.error('❌  Fatal:', err); process.exit(1) })
