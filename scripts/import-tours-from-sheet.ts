/**
 * scripts/import-tours-from-sheet.ts
 * Import dữ liệu chi tiết tour từ Google Sheets (tab "tours_master") → bảng tours Supabase.
 * Chỉ ghi các cột detail — không đụng giá, ảnh, trạng thái của tour.
 *
 * Chạy: npx tsx scripts/import-tours-from-sheet.ts [--dry-run]
 *
 * Flags:
 *   --dry-run  : Validate toàn bộ, in báo cáo, KHÔNG ghi Supabase
 *
 * Env cần thiết (.env.local):
 *   GOOGLE_SERVICE_ACCOUNT_JSON    ← JSON stringify của service account (ưu tiên)
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL   ← hoặc email riêng (nếu không có JSON)
 *   GOOGLE_PRIVATE_KEY             ← hoặc private key riêng (nếu không có JSON)
 *   GOOGLE_SHEETS_SPREADSHEET_ID   ← ID spreadsheet
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import * as path from 'path'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { z } from 'zod'
import WebSocket from 'ws'

// DbClient type được suy luận từ hàm gọi thực tế — tránh ReturnType<typeof createClient>
// (generic mặc định của createClient ≠ kiểu được infer khi truyền string args)
function _buildClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket },
  })
}
type DbClient = ReturnType<typeof _buildClient>

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ─── Config ───────────────────────────────────────────────────────────────────

const SHEET_TAB   = 'tours_master'
const SHEET_RANGE = `${SHEET_TAB}!A:N`
const CHUNK_SIZE  = 500

const EXPECTED_HEADERS = [
  'code', 'slug', 'name', 'category', 'duration', 'departure',
  'summary', 'highlights_json', 'itinerary_json',
  'inclusions_json', 'exclusions_json', 'policies', 'pdf_url', 'crawled_at',
] as const

type HeaderKey = (typeof EXPECTED_HEADERS)[number]

// ─── CLI args ─────────────────────────────────────────────────────────────────

const argv  = process.argv.slice(2)
const isDry = argv.includes('--dry-run')

// ─── Env vars ─────────────────────────────────────────────────────────────────

// Support GOOGLE_SERVICE_ACCOUNT_JSON (same as SeaStar crawler) OR separate vars
function extractSACredentials(): { email: string; key: string } {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (json) {
    try {
      const parsed = JSON.parse(json) as { client_email?: string; private_key?: string }
      return {
        email: parsed.client_email ?? '',
        key:   (parsed.private_key ?? '').replace(/\\n/g, '\n'),
      }
    } catch { /* fall through to separate vars */ }
  }
  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '',
    key:   (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  }
}

const { email: SA_EMAIL, key: SA_KEY } = extractSACredentials()
const SHEET_ID     = (process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? '').split('/')[0].trim()
const SUPA_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPA_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const ItineraryDaySchema = z.object({
  day:         z.number().int().positive(),
  title:       z.string().min(1),
  description: z.string().min(1),
  meals:       z.array(z.string()).optional(),
})

const SheetRowSchema = z.object({
  code:       z.string().min(1, 'code trống'),
  slug:       z
    .string()
    .min(1, 'slug trống')
    .regex(/^[a-z0-9-]+$/, 'slug phải là chữ thường, số, gạch ngang'),
  name:       z.string().min(1, 'name trống'),
  category:   z.string().nullable().optional(),
  duration:   z.string().nullable().optional(),
  departure:  z.string().nullable().optional(),
  summary:    z.string().nullable().optional(),
  highlights: z.array(z.string()).nullable().optional(),
  itinerary:  z.array(ItineraryDaySchema).nullable().optional(),
  inclusions: z.array(z.string()).nullable().optional(),
  exclusions: z.array(z.string()).nullable().optional(),
  policies:   z.string().nullable().optional(),
  pdf_url:    z.string().nullable().optional(),
  crawled_at: z.string().nullable().optional(),
})

type SheetRow = z.infer<typeof SheetRowSchema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidatedRow extends SheetRow {
  _sheetRow: number // 1-based row number in Sheets (header = row 1)
}

interface RowError {
  sheetRow: number
  code:     string
  errors:   string[]
}

// Cột detail truyền vào upsert — KHÔNG bao gồm giá, ảnh, status
interface TourDetailUpsert {
  code:             string
  name:             string
  slug:             string
  category?:        string | null
  summary?:         string | null
  // highlights: TEXT trong DB hiện tại; PostgREST serialize string[] → JSON string
  highlights?:      string[] | null
  itinerary?:       Array<{ day: number; title: string; description: string; meals?: string[] }> | null
  inclusions?:      string[] | null
  exclusions?:      string[] | null
  policies?:        string | null
  pdf_url?:         string | null
  detail_synced_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJsonField<T>(
  raw: string | null,
  fieldName: string,
): { value: T | null; error: string | null } {
  if (!raw || raw.trim() === '') return { value: null, error: null }
  try {
    return { value: JSON.parse(raw) as T, error: null }
  } catch (e) {
    return { value: null, error: `${fieldName}: JSON.parse lỗi — ${(e as Error).message}` }
  }
}

function getCell(row: (string | null)[], idx: number | undefined): string | null {
  if (idx === undefined) return null
  const v = row[idx]
  if (v === undefined || v === null || String(v).trim() === '') return null
  return String(v).trim()
}

// ─── Phase 1: Đọc Google Sheets ──────────────────────────────────────────────

async function fetchSheetRows(): Promise<{ headers: string[]; rows: (string | null)[][] }> {
  const auth = new google.auth.JWT({
    email:  SA_EMAIL,
    key:    SA_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range:         SHEET_RANGE,
  })
  const values = res.data.values ?? []
  if (values.length === 0) return { headers: [], rows: [] }

  const headers = (values[0] as string[]).map(h => String(h).trim().toLowerCase())
  const rows = (values.slice(1) as (string | null)[][]).map(r =>
    r.map(v => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim()))
  )
  return { headers, rows }
}

// ─── Phase 2: Validate từng dòng ─────────────────────────────────────────────

function validateRow(
  rawRow: (string | null)[],
  headerIndex: Map<HeaderKey, number>,
  sheetRow: number,
): { valid: ValidatedRow | null; errors: RowError | null } {
  const get = (key: HeaderKey): string | null => getCell(rawRow, headerIndex.get(key))

  const code = get('code')
  if (!code) {
    return {
      valid:  null,
      errors: { sheetRow, code: '(trống)', errors: ['code trống — bỏ qua dòng'] },
    }
  }

  const jsonErrors: string[] = []

  const hlRes = parseJsonField<string[]>(get('highlights_json'), 'highlights_json')
  const itRes = parseJsonField<Array<{ day: number; title: string; description: string }>>(
    get('itinerary_json'), 'itinerary_json',
  )
  const inRes = parseJsonField<string[]>(get('inclusions_json'), 'inclusions_json')
  const exRes = parseJsonField<string[]>(get('exclusions_json'), 'exclusions_json')

  if (hlRes.error) jsonErrors.push(hlRes.error)
  if (itRes.error) jsonErrors.push(itRes.error)
  if (inRes.error) jsonErrors.push(inRes.error)
  if (exRes.error) jsonErrors.push(exRes.error)

  const raw = {
    code,
    slug:       get('slug'),
    name:       get('name'),
    category:   get('category'),
    duration:   get('duration'),
    departure:  get('departure'),
    summary:    get('summary'),
    highlights: hlRes.value,
    itinerary:  itRes.value,
    inclusions: inRes.value,
    exclusions: exRes.value,
    policies:   get('policies'),
    pdf_url:    get('pdf_url'),
    crawled_at: get('crawled_at'),
  }

  const result = SheetRowSchema.safeParse(raw)
  const allErrors: string[] = [...jsonErrors]

  if (!result.success) {
    allErrors.push(
      ...result.error.issues.map(i => `${i.path.join('.') || 'root'}: ${i.message}`)
    )
    return { valid: null, errors: { sheetRow, code, errors: allErrors } }
  }

  if (allErrors.length > 0) {
    // JSON parse errors đã xảy ra — Zod pass nhưng vẫn có lỗi JSON
    return { valid: null, errors: { sheetRow, code, errors: allErrors } }
  }

  return {
    valid:  { ...result.data, _sheetRow: sheetRow },
    errors: null,
  }
}

// ─── Phase 3: Resolve slug conflicts ─────────────────────────────────────────

async function resolveSlugConflicts(
  validRows: ValidatedRow[],
  supabase: DbClient,
): Promise<{ resolved: Map<string, string>; notes: string[] }> {
  // Lấy (code, slug) tất cả tour hiện có trong DB
  const { data: existing } = await supabase
    .from('tours')
    .select('code, slug')
    .not('slug', 'is', null)

  const dbSlugToCode = new Map<string, string>()
  for (const t of (existing ?? []) as Array<{ code: string; slug: string }>) {
    if (t.slug) dbSlugToCode.set(t.slug, t.code)
  }

  // Phát hiện trùng slug trong chính batch này (first-come-first-served)
  const batchSlugs = new Map<string, string>() // slug → code đã nhận slug đó
  const notes: string[] = []
  const resolved = new Map<string, string>() // code → final slug

  for (const row of validRows) {
    const desired = row.slug
    let finalSlug  = desired

    // Conflict với DB (tour khác sở hữu slug này)
    const dbOwner = dbSlugToCode.get(desired)
    const dbConflict = dbOwner !== undefined && dbOwner !== row.code

    // Conflict trong batch (slug đã được code khác nhận trước đó)
    const batchOwner = batchSlugs.get(desired)
    const batchConflict = batchOwner !== undefined && batchOwner !== row.code

    if (dbConflict || batchConflict) {
      const suffix = `-${row.code.toLowerCase()}`
      finalSlug = `${desired}${suffix}`
      const reason = dbConflict
        ? `đụng tour "${dbOwner}" trong DB`
        : `trùng trong batch với code "${batchOwner}"`
      notes.push(`  Dòng ${row._sheetRow} [${row.code}]: slug "${desired}" → "${finalSlug}" (${reason})`)

      // Cảnh báo nếu slug fallback vẫn còn conflict
      const fallbackDbOwner = dbSlugToCode.get(finalSlug)
      if (fallbackDbOwner && fallbackDbOwner !== row.code) {
        notes.push(`    ⚠ Slug fallback "${finalSlug}" vẫn đụng "${fallbackDbOwner}" — cần sửa tay.`)
      }
    }

    resolved.set(row.code, finalSlug)
    // Chỉ đặt chủ sở hữu batch nếu chưa có (first-come)
    if (!batchSlugs.has(finalSlug)) batchSlugs.set(finalSlug, row.code)
  }

  return { resolved, notes }
}

// ─── Phase 4: Upsert vào Supabase ────────────────────────────────────────────

async function upsertBatch(
  payload: TourDetailUpsert[],
  supabase: DbClient,
): Promise<{ upserted: number; failed: number }> {
  let upserted = 0
  let failed   = 0
  const syncedAt = new Date().toISOString()

  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    const chunk = payload.slice(i, i + CHUNK_SIZE).map(r => ({
      ...r,
      detail_synced_at: syncedAt,
    }))
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1

    const { error } = await supabase
      .from('tours')
      .upsert(chunk, { onConflict: 'code', ignoreDuplicates: false })

    if (error) {
      process.stderr.write(`[CHUNK ${chunkNum}] Lỗi: ${error.message}\n`)
      failed += chunk.length
    } else {
      upserted += chunk.length
      process.stdout.write(`  ↳ Chunk ${chunkNum}: +${chunk.length} (tổng ${upserted})\r`)
    }
  }

  process.stdout.write('\n')
  return { upserted, failed }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n🗓️  Nam Ngân Travel — Import Tours từ Google Sheets → Supabase')
  console.log(isDry ? '🔍 Chế độ: DRY-RUN (không ghi DB)' : '🚀 Chế độ: LIVE (sẽ ghi Supabase)')
  console.log(`📋 Sheet: ${SHEET_ID || '(chưa set)'} → tab "${SHEET_TAB}"\n`)

  // 1. Kiểm tra env vars
  const missing = [
    !SA_EMAIL     && 'GOOGLE_SERVICE_ACCOUNT_EMAIL (hoặc GOOGLE_SERVICE_ACCOUNT_JSON)',
    !SA_KEY       && 'GOOGLE_PRIVATE_KEY (hoặc GOOGLE_SERVICE_ACCOUNT_JSON)',
    !SHEET_ID     && 'GOOGLE_SHEETS_SPREADSHEET_ID',
    !SUPA_URL     && 'NEXT_PUBLIC_SUPABASE_URL',
    !SUPA_SVC_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter((v): v is string => typeof v === 'string')

  if (missing.length > 0) {
    process.stderr.write(`[ERROR] Thiếu env vars: ${missing.join(', ')}\n`)
    process.exit(1)
  }

  // 2. Đọc Sheets
  console.log('📥 Đang đọc Google Sheets...')
  let headers: string[]
  let rows: (string | null)[][]
  try {
    ;({ headers, rows } = await fetchSheetRows())
  } catch (e) {
    process.stderr.write(`[ERROR] Không thể đọc Sheets: ${(e as Error).message}\n`)
    process.exit(1)
  }

  if (rows.length === 0) {
    console.log('⚠️  Sheet trống hoặc chỉ có header. Không có gì để import.')
    return
  }
  console.log(`📊 Đọc được ${rows.length} dòng dữ liệu.\n`)

  // 3. Kiểm tra header
  const headerIndex = new Map<HeaderKey, number>()
  const missingCols: string[] = []
  for (const h of EXPECTED_HEADERS) {
    const idx = headers.indexOf(h)
    if (idx === -1) missingCols.push(h)
    else headerIndex.set(h, idx)
  }
  if (missingCols.length > 0) {
    process.stderr.write(`[ERROR] Tab "${SHEET_TAB}" thiếu cột: ${missingCols.join(', ')}\n`)
    process.exit(1)
  }

  // 4. Validate từng dòng
  const validRows: ValidatedRow[] = []
  const rowErrors: RowError[]     = []

  for (let i = 0; i < rows.length; i++) {
    const sheetRow = i + 2 // header là row 1; dữ liệu bắt đầu từ row 2
    const row = rows[i]
    if (row.every(v => !v)) continue // bỏ qua dòng trống hoàn toàn

    const { valid, errors } = validateRow(row, headerIndex, sheetRow)
    if (valid) validRows.push(valid)
    else if (errors) rowErrors.push(errors)
  }

  // 5. Khởi tạo Supabase client (cần ngay cả dry-run để đọc existing slugs)
  const supabase = _buildClient(SUPA_URL, SUPA_SVC_KEY)

  // 6. Resolve slug conflicts
  console.log('🔍 Đang kiểm tra slug conflicts...')
  const { resolved: resolvedSlugs, notes: slugNotes } = await resolveSlugConflicts(
    validRows,
    supabase,
  )

  // 7. Build upsert payload
  const payload: TourDetailUpsert[] = validRows.map(row => ({
    code:       row.code,
    name:       row.name,
    slug:       resolvedSlugs.get(row.code) ?? row.slug,
    category:   row.category   ?? null,
    summary:    row.summary    ?? null,
    highlights: row.highlights ?? null,
    itinerary:  row.itinerary  ?? null,
    inclusions: row.inclusions ?? null,
    exclusions: row.exclusions ?? null,
    policies:   row.policies   ?? null,
    pdf_url:    row.pdf_url    ?? null,
    detail_synced_at: new Date().toISOString(),
  }))

  // 8. In báo cáo (luôn in)
  console.log('\n─────────────────────────────────────────────')
  console.log('📊 BÁO CÁO VALIDATE')
  console.log(`   Dòng đọc từ Sheets:  ${rows.length}`)
  console.log(`   Hợp lệ:              ${validRows.length}`)
  console.log(`   Lỗi JSON/Zod:        ${rowErrors.length}`)

  if (rowErrors.length > 0) {
    console.log('\n⚠️  DÒNG LỖI — cần sửa trên Sheets trước khi import lại:')
    for (const e of rowErrors) {
      console.log(`\n   Dòng ${e.sheetRow} [${e.code}]:`)
      for (const msg of e.errors) {
        console.log(`     ✗ ${msg}`)
      }
    }
  }

  if (slugNotes.length > 0) {
    console.log('\n🔀 SLUG CONFLICTS (đã tự xử lý):')
    for (const n of slugNotes) console.log(n)
  }

  if (isDry) {
    console.log('\n✅ DRY-RUN hoàn tất. Không có gì được ghi vào DB.')
    console.log(`   (${validRows.length} tour sẵn sàng import khi bỏ --dry-run)`)
    console.log('─────────────────────────────────────────────\n')
    return
  }

  if (payload.length === 0) {
    console.log('\n⚠️  Không có dòng hợp lệ để upsert. Hoàn tất.')
    return
  }

  // 9. Deduplicate by code (keep last occurrence — Sheets data có thể trùng code)
  const dedupMap = new Map<string, TourDetailUpsert>()
  for (const row of payload) dedupMap.set(row.code, row)
  const dedupedPayload = Array.from(dedupMap.values())
  if (dedupedPayload.length < payload.length) {
    console.log(`\n⚠️  Dedup: ${payload.length} → ${dedupedPayload.length} (bỏ ${payload.length - dedupedPayload.length} code trùng)`)
  }

  // 10. Upsert (LIVE only)
  console.log(`\n📤 Đang upsert ${dedupedPayload.length} tour vào Supabase...`)
  const { upserted, failed } = await upsertBatch(dedupedPayload, supabase)

  console.log('\n─────────────────────────────────────────────')
  console.log('✅ HOÀN TẤT')
  console.log(`   Dòng đọc từ Sheets:  ${rows.length}`)
  console.log(`   Hợp lệ:              ${validRows.length}`)
  console.log(`   Lỗi JSON/Zod:        ${rowErrors.length}`)
  console.log(`   Đã upsert:           ${upserted}`)
  if (failed > 0) console.log(`   ❌ Thất bại:          ${failed}`)
  console.log('─────────────────────────────────────────────\n')
}

main().catch(err => {
  process.stderr.write('[FATAL] ' + String(err) + '\n')
  process.exit(1)
})
