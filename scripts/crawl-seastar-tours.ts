/**
 * scripts/crawl-seastar-tours.ts
 * SeaStar Crawler v3 — scrape tour catalog → Claude PDF extraction → Google Sheets
 *
 * Chạy: npx tsx scripts/crawl-seastar-tours.ts [--limit=N] [--force-ai] [--dry-run]
 *
 * Flags:
 *   --limit=N    : Chỉ xử lý N tour đầu tiên (test)
 *   --force-ai   : Bỏ qua cache JSON, luôn gọi Claude
 *   --dry-run    : Không ghi Sheets
 *
 * Env cần thiết (.env.local):
 *   SEASTAR_COOKIE              ← lấy từ DevTools (header Cookie khi đăng nhập)
 *   ANTHROPIC_API_KEY           ← đã có
 *   GOOGLE_SERVICE_ACCOUNT_JSON ← JSON stringify của service account
 *   GOOGLE_SHEETS_SPREADSHEET_ID← đã có
 */

import * as path from 'path'
import * as fs   from 'fs'
import axios     from 'axios'
import * as cheerio from 'cheerio'
import Anthropic from '@anthropic-ai/sdk'
import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL            = 'https://lich.seastartravel.vn'
const SHEET_TAB           = 'tours_master'
const SHEET_COLS          = ['code','slug','name','category','duration','departure',
                              'summary','highlights_json','itinerary_json',
                              'inclusions_json','exclusions_json','policies',
                              'pdf_url','crawled_at'] as const
const PDF_DIR             = path.resolve(process.cwd(), 'data/seastar-pdfs')
const JSON_DIR            = path.resolve(process.cwd(), 'data/seastar-json')
const DELAY_MS            = 1500
const MAX_PDF_MB          = 30

const ANTHROPIC_API_KEY        = process.env.ANTHROPIC_API_KEY ?? ''
const SEASTAR_COOKIE           = process.env.SEASTAR_COOKIE ?? ''
const GOOGLE_SA_JSON           = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? ''
const GOOGLE_SHEETS_ID         = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? ''

// ─── CLI args ─────────────────────────────────────────────────────────────────

const argv     = process.argv.slice(2)
const isDryRun = argv.includes('--dry-run')
const forceAI  = argv.includes('--force-ai')
const limitArg = argv.find(a => a.startsWith('--limit='))
const LIMIT    = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity

// ─── Zod schema ───────────────────────────────────────────────────────────────

const ItineraryDaySchema = z.object({
  day:         z.number().int().positive(),
  title:       z.string().min(1),
  description: z.string().min(1),
})

const TourExtractSchema = z.object({
  code:        z.string().min(1),
  name:        z.string().min(1),
  slug:        z.string().regex(/^[a-z0-9-]+$/, 'slug phải là chữ thường, số, gạch ngang'),
  category:    z.enum(['trong nước', 'nước ngoài']),
  duration:    z.string().min(1),
  departure:   z.string().min(1),
  summary:     z.string().min(1),
  highlights:  z.array(z.string()).min(1),
  itinerary:   z.array(ItineraryDaySchema).min(1),
  inclusions:  z.array(z.string()),
  exclusions:  z.array(z.string()),
  policies:    z.string().nullable(),
})

type TourExtract = z.infer<typeof TourExtractSchema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourEntry {
  code:    string
  name:    string
  route:   string
  pdf_url: string
}

interface CrawlStats {
  total:         number
  downloaded:    number
  aiCalled:      number
  sheetsWritten: number
  manualReview:  string[]
  errors:        string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '')
}

function ensureDirs(): void {
  fs.mkdirSync(PDF_DIR, { recursive: true })
  fs.mkdirSync(JSON_DIR, { recursive: true })
}

function pdfPath(code: string): string {
  return path.join(PDF_DIR, `${code}.pdf`)
}

function jsonPath(code: string): string {
  return path.join(JSON_DIR, `${code}.json`)
}

// ─── Phase 1 — Scrape tour listing ────────────────────────────────────────────

async function fetchDestinations(): Promise<Array<{ id: number; name: string }>> {
  const res = await axios.get<{
    data?: { destinations?: Array<{ id: number; name: string }> }
  }>(`${BASE_URL}/api/filter.php`, {
    headers: buildHeaders(),
    timeout: 15000,
  })
  return res.data?.data?.destinations ?? []
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept':     'text/html,application/xhtml+xml,application/json,*/*',
    'Referer':    `${BASE_URL}/`,
    ...(SEASTAR_COOKIE ? { 'Cookie': SEASTAR_COOKIE } : {}),
    ...extra,
  }
}

async function scrapeTourList(destId: number): Promise<TourEntry[]> {
  // Thử API JSON trước, fallback về HTML scrape
  try {
    const res = await axios.get<unknown>(`${BASE_URL}/api/tours.php?dest_id=${destId}`, {
      headers: buildHeaders({ Accept: 'application/json' }),
      timeout: 15000,
    })
    const data = res.data as { data?: Array<{ code?: string; name?: string; route?: string; pdf_url?: string }> }
    if (Array.isArray(data?.data) && data.data.length > 0) {
      return data.data
        .filter(t => t.pdf_url)
        .map(t => ({
          code:    t.code    ?? `SS-${destId}-${Date.now()}`,
          name:    t.name    ?? '',
          route:   t.route   ?? '',
          pdf_url: t.pdf_url ?? '',
        }))
    }
  } catch {
    // API không tồn tại → thử HTML
  }

  // HTML scrape: tìm các link .pdf trên trang destination
  const pageUrl = `${BASE_URL}/?dest_id=${destId}`
  const res = await axios.get<string>(pageUrl, {
    headers: buildHeaders({ Accept: 'text/html' }),
    timeout: 20000,
    responseType: 'text',
  })
  const $ = cheerio.load(res.data as string)
  const entries: TourEntry[] = []

  // Tìm mọi <a href="...pdf"> trên trang
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (!href.toLowerCase().includes('.pdf')) return

    const fullUrl   = href.startsWith('http') ? href : `${BASE_URL}${href}`
    const rowText   = $(el).closest('tr, .tour-item, .program-item, li').text().trim()
    const tourName  = $(el).attr('title') || $(el).text().trim() || rowText.split('\n')[0].trim() || `Tour ${destId}`
    const codeMatch = rowText.match(/\b([A-Z]{2,4}-\d{3,6})\b/) ??
                      fullUrl.match(/\/([A-Z]{2,4}-\d{3,6})[._/]/)
    const code      = codeMatch ? codeMatch[1] : `SS-${destId}-${slugify(tourName).slice(0, 12)}`

    if (fullUrl && !entries.some(e => e.pdf_url === fullUrl)) {
      entries.push({ code, name: tourName, route: '', pdf_url: fullUrl })
    }
  })

  return entries
}

// ─── Phase 2 — Download PDF ───────────────────────────────────────────────────

async function downloadPdf(entry: TourEntry): Promise<'ok' | 'skip' | 'oversize'> {
  const dest = pdfPath(entry.code)
  if (fs.existsSync(dest)) return 'skip'

  const res = await axios.get<Buffer>(entry.pdf_url, {
    headers:      buildHeaders(),
    responseType: 'arraybuffer',
    timeout:      60000,
    maxRedirects: 5,
  })

  const buf      = Buffer.from(res.data)
  const sizeMB   = buf.length / 1024 / 1024
  if (sizeMB > MAX_PDF_MB) return 'oversize'

  fs.writeFileSync(dest, buf)
  return 'ok'
}

// ─── Phase 3 — Claude extraction ─────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

const EXTRACT_PROMPT = `Bạn là chuyên gia phân tích tour du lịch. Hãy đọc tài liệu PDF của chương trình tour và trích xuất thông tin theo cấu trúc JSON sau.

Trả về JSON thuần túy (không có markdown, không có \`\`\`json), đúng schema:
{
  "code":       "Mã tour, ví dụ: SS-HN-001 hoặc lấy từ tài liệu",
  "name":       "Tên đầy đủ của tour",
  "slug":       "tên-tour-dạng-slug-chỉ-chữ-thường-số-gạch-ngang",
  "category":   "trong nước" hoặc "nước ngoài",
  "duration":   "Ví dụ: 4 ngày 3 đêm",
  "departure":  "Thành phố xuất phát, ví dụ: Hà Nội, TP.HCM",
  "summary":    "Mô tả ngắn 100–200 ký tự về tour",
  "highlights": ["điểm nổi bật 1", "điểm nổi bật 2", ...],
  "itinerary":  [{ "day": 1, "title": "Tiêu đề ngày 1", "description": "Mô tả chi tiết" }, ...],
  "inclusions": ["Điểm đã bao gồm 1", ...],
  "exclusions": ["Điểm chưa bao gồm 1", ...],
  "policies":   "Chính sách hủy/đổi tour hoặc null nếu không có"
}

Lưu ý:
- slug: chuyển tên tour về chữ thường không dấu, thay khoảng trắng bằng gạch ngang
- category: dựa trên điểm đến (Việt Nam → "trong nước", nước ngoài → "nước ngoài")
- highlights: tối thiểu 1 mục
- itinerary: tối thiểu 1 ngày, day phải là số nguyên dương`

async function extractWithClaude(entry: TourEntry, attempt = 1, zodError = ''): Promise<TourExtract | null> {
  const cached = jsonPath(entry.code)
  if (!forceAI && fs.existsSync(cached)) {
    const raw = JSON.parse(fs.readFileSync(cached, 'utf-8')) as unknown
    const result = TourExtractSchema.safeParse(raw)
    if (result.success) return result.data
  }

  const pdfBuf = fs.readFileSync(pdfPath(entry.code))
  const b64    = pdfBuf.toString('base64')

  const userContent: Anthropic.MessageParam['content'] = [
    {
      type:   'document',
      source: { type: 'base64', media_type: 'application/pdf', data: b64 },
    } as unknown as Anthropic.TextBlockParam,
    {
      type: 'text',
      text: attempt === 1
        ? EXTRACT_PROMPT
        : `${EXTRACT_PROMPT}\n\nLần trước bạn trả về JSON bị lỗi Zod:\n${zodError}\nHãy sửa và trả về JSON hợp lệ.`,
    },
  ]

  const msg = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 8000,
    messages:   [{ role: 'user', content: userContent }],
  })

  const raw = (msg.content[0] as Anthropic.TextBlock).text
    .replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error(`  ✗ Claude trả về không phải JSON hợp lệ (${entry.code})`)
    return null
  }

  // Đảm bảo code và slug đồng bộ với entry
  if (typeof parsed === 'object' && parsed !== null) {
    const p = parsed as Record<string, unknown>
    if (!p.code || p.code === '') p.code = entry.code
    if (!p.slug || p.slug === '') p.slug = slugify(entry.name || String(p.name ?? ''))
  }

  const result = TourExtractSchema.safeParse(parsed)
  if (result.success) {
    fs.writeFileSync(cached, JSON.stringify(result.data, null, 2))
    return result.data
  }

  if (attempt === 1) {
    console.warn(`  ⚠ Zod lỗi (${entry.code}), retry...`)
    return extractWithClaude(entry, 2, JSON.stringify(result.error.flatten()))
  }

  console.error(`  ✗ Zod lỗi lần 2 (${entry.code}):`, result.error.flatten())
  return null
}

// ─── Phase 4 — Google Sheets upsert ──────────────────────────────────────────

async function buildSheetsAuth() {
  if (!GOOGLE_SA_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON chưa set')
  const sa = JSON.parse(GOOGLE_SA_JSON) as { client_email: string; private_key: string }
  const auth = new google.auth.JWT({
    email:  sa.client_email,
    key:    sa.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return auth
}

async function sheetsUpsert(
  tours: Array<{ entry: TourEntry; data: TourExtract }>,
  isDry: boolean
): Promise<number> {
  if (tours.length === 0) return 0

  const auth    = await buildSheetsAuth()
  const sheets  = google.sheets({ version: 'v4', auth })
  const range   = `${SHEET_TAB}!A:N`

  // Đọc dữ liệu hiện tại — xây Map<code, rowIndex (1-based)>
  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEETS_ID,
    range,
  })
  const existing = getRes.data.values ?? []
  const codeMap  = new Map<string, number>()

  // Ghi header nếu tab trống
  const needHeader = existing.length === 0
  if (needHeader && !isDry) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range:         `${SHEET_TAB}!A1`,
      valueInputOption: 'RAW',
      requestBody:   { values: [SHEET_COLS.map(c => c)] },
    })
    existing.push(SHEET_COLS.map(c => c))
  }

  existing.forEach((row, idx) => {
    if (idx === 0) return // header
    const code = String(row[0] ?? '').trim()
    if (code) codeMap.set(code, idx + 1) // 1-based row
  })

  let written = 0

  for (const { entry, data } of tours) {
    const row: (string | number | null)[] = [
      data.code,
      data.slug,
      data.name,
      data.category,
      data.duration,
      data.departure,
      data.summary,
      JSON.stringify(data.highlights),
      JSON.stringify(data.itinerary),
      JSON.stringify(data.inclusions),
      JSON.stringify(data.exclusions),
      data.policies ?? '',
      entry.pdf_url,
      new Date().toISOString(),
    ]

    if (isDry) {
      console.log(`  [dry-run] ${data.code} — ${data.name}`)
      written++
      continue
    }

    const existingRow = codeMap.get(data.code)
    if (existingRow) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range:         `${SHEET_TAB}!A${existingRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody:   { values: [row] },
      })
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range:         `${SHEET_TAB}!A1`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody:   { values: [row] },
      })
      codeMap.set(data.code, existing.length + 1)
    }

    written++
    await sleep(300) // tránh rate limit Sheets API
  }

  return written
}

// ─── Phase 5 — Stats ─────────────────────────────────────────────────────────

function printStats(stats: CrawlStats): void {
  console.log('\n' + '═'.repeat(60))
  console.log('SeaStar Crawler v3 — KẾT QUẢ')
  console.log('═'.repeat(60))
  console.log(`Tours phát hiện:    ${stats.total}`)
  console.log(`PDF đã tải:         ${stats.downloaded}`)
  console.log(`Claude gọi:         ${stats.aiCalled}`)
  console.log(`Sheets đã ghi:      ${stats.sheetsWritten}`)
  console.log(`Cần review thủ công: ${stats.manualReview.length}`)
  console.log(`Lỗi:                ${stats.errors.length}`)

  if (stats.manualReview.length > 0) {
    console.log('\n📋 MANUAL REVIEW (PDF > 30MB hoặc AI thất bại):')
    stats.manualReview.forEach(c => console.log(`  - ${c}`))
  }

  if (stats.errors.length > 0) {
    console.log('\n❌ LỖI:')
    stats.errors.slice(0, 20).forEach(e => console.log(`  - ${e}`))
    if (stats.errors.length > 20) console.log(`  ... và ${stats.errors.length - 20} lỗi khác`)
  }

  if (isDryRun) console.log('\n⚡ DRY-RUN: không có thay đổi nào được ghi vào Sheets')
  console.log('═'.repeat(60) + '\n')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Kiểm tra env
  const missing: string[] = []
  if (!ANTHROPIC_API_KEY)  missing.push('ANTHROPIC_API_KEY')
  if (!GOOGLE_SA_JSON)     missing.push('GOOGLE_SERVICE_ACCOUNT_JSON')
  if (!GOOGLE_SHEETS_ID)   missing.push('GOOGLE_SHEETS_SPREADSHEET_ID')
  if (!SEASTAR_COOKIE)     console.warn('⚠  SEASTAR_COOKIE chưa set — HTML scrape có thể trả 401/403')
  if (missing.length > 0)  { console.error('❌ Thiếu env:', missing.join(', ')); process.exit(1) }

  ensureDirs()

  const stats: CrawlStats = {
    total: 0, downloaded: 0, aiCalled: 0, sheetsWritten: 0,
    manualReview: [], errors: [],
  }

  console.log(`\n🚀 SeaStar Crawler v3${isDryRun ? ' [DRY-RUN]' : ''}${forceAI ? ' [FORCE-AI]' : ''}${LIMIT < Infinity ? ` [LIMIT=${LIMIT}]` : ''}\n`)

  // Phase 1 — Destinations
  console.log('Phase 1 — Lấy danh sách destinations...')
  let destinations: Array<{ id: number; name: string }>
  try {
    destinations = await fetchDestinations()
    console.log(`  ✓ ${destinations.length} destinations`)
  } catch (err) {
    console.error('  ✗ Không lấy được destinations:', err)
    process.exit(1)
  }

  // Scrape tour list mỗi destination
  const allEntries: TourEntry[] = []
  for (const dest of destinations) {
    try {
      const entries = await scrapeTourList(dest.id)
      console.log(`  ${dest.name}: ${entries.length} tour(s)`)
      allEntries.push(...entries)
    } catch (err) {
      stats.errors.push(`scrape dest ${dest.id} (${dest.name}): ${err}`)
    }
    await sleep(DELAY_MS)
  }

  // Dedup by pdf_url
  const seen      = new Set<string>()
  const entries   = allEntries.filter(e => {
    if (!e.pdf_url || seen.has(e.pdf_url)) return false
    seen.add(e.pdf_url)
    return true
  })

  const limited = LIMIT < Infinity ? entries.slice(0, LIMIT) : entries
  stats.total   = limited.length
  console.log(`\n  Tổng: ${stats.total} tour (sau dedup)\n`)

  // Phase 2 + 3 — Download PDF + Claude extract
  console.log('Phase 2+3 — Download PDF & Claude extraction...')
  const toWrite: Array<{ entry: TourEntry; data: TourExtract }> = []

  for (let i = 0; i < limited.length; i++) {
    const entry = limited[i]
    console.log(`  [${i + 1}/${limited.length}] ${entry.code} — ${entry.name}`)

    // Download
    let dlResult: 'ok' | 'skip' | 'oversize'
    try {
      dlResult = await downloadPdf(entry)
      if (dlResult === 'skip')    console.log('    ↩ PDF đã có (cache)')
      if (dlResult === 'ok')      { console.log('    ✓ Tải PDF xong'); stats.downloaded++ }
      if (dlResult === 'oversize') {
        console.warn(`    ⚠ PDF > ${MAX_PDF_MB}MB — bỏ qua AI`)
        stats.manualReview.push(`${entry.code} (PDF oversize)`)
        continue
      }
    } catch (err) {
      stats.errors.push(`download PDF ${entry.code}: ${err}`)
      continue
    }

    // Claude
    try {
      const data = await extractWithClaude(entry)
      if (!data) {
        stats.manualReview.push(`${entry.code} (AI extract thất bại)`)
        continue
      }
      if (dlResult !== 'skip' || forceAI) stats.aiCalled++
      console.log(`    ✓ AI extract: ${data.name} (${data.category})`)
      toWrite.push({ entry, data })
    } catch (err) {
      stats.errors.push(`claude ${entry.code}: ${err}`)
      stats.manualReview.push(`${entry.code} (AI exception)`)
    }

    await sleep(DELAY_MS)
  }

  // Phase 4 — Sheets
  console.log(`\nPhase 4 — Ghi Google Sheets (${toWrite.length} tours)...`)
  try {
    stats.sheetsWritten = await sheetsUpsert(toWrite, isDryRun)
    console.log(`  ✓ ${stats.sheetsWritten} dòng đã ${isDryRun ? 'preview' : 'ghi'}`)
  } catch (err) {
    stats.errors.push(`Sheets write: ${err}`)
    console.error('  ✗ Lỗi ghi Sheets:', err)
  }

  // Phase 5 — Stats
  printStats(stats)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
