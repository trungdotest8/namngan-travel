/**
 * scripts/import-sms-audience.ts
 * Đọc ./data/sms-log.xlsx → chuẩn hóa SĐT → UPSERT vào audience_contacts
 *
 * Chạy: npx tsx scripts/import-sms-audience.ts [--dry-run] [--file ./data/sms-log.xlsx]
 *
 * Flags:
 *   --dry-run   : Xử lý toàn bộ, in báo cáo, KHÔNG ghi Supabase
 *   --file <p>  : Đường dẫn file Excel (mặc định ./data/sms-log.xlsx)
 *   --test      : Dùng ./data/sms-log.test.xlsx + bật --dry-run
 */

import * as path from 'path'
import * as fs   from 'fs'
import * as XLSX  from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// ─── Load .env.local (cùng tên biến với Next.js) ─────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ─── CLI args ─────────────────────────────────────────────────────────────────
const argv   = process.argv.slice(2)
const isDry  = argv.includes('--dry-run') || argv.includes('--test')
const isTest = argv.includes('--test')

const fileArgIdx = argv.indexOf('--file')
const defaultFile = isTest ? './data/sms-log.test.xlsx' : './data/sms-log.xlsx'
const inputFile  = fileArgIdx !== -1 ? argv[fileArgIdx + 1] : defaultFile
const filePath   = path.resolve(process.cwd(), inputFile)

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContactRow {
  phone:      string
  source:     string
  first_seen: Date | null
  last_seen:  Date | null
}

// ─── Normalise phone ──────────────────────────────────────────────────────────
/**
 * Nhận chuỗi bất kỳ, trả về chuỗi E.164 không dấu + ("84xxxxxxxxx")
 * hoặc null nếu không hợp lệ.
 *
 * Bẫy Excel: ô số có thể bị nuốt số 0 đầu → "973168492" (9 chữ số, mất "0")
 */
function normalizePhone(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null

  // Excel có thể trả number cho ô số không có định dạng text
  let s: string
  if (typeof raw === 'number') {
    s = String(Math.round(raw)) // round để tránh float 9.731684e8
  } else {
    s = String(raw)
  }

  // Strip mọi ký tự không phải chữ số và dấu +
  const stripped = s.replace(/[^\d+]/g, '')

  // Bỏ dấu + đầu để xử lý đồng nhất
  const digits = stripped.replace(/^\+/, '')

  if (digits.length === 0) return null

  // Chuẩn hóa về "84xxxxxxxxx"
  let normalized: string

  if (digits.startsWith('84') && digits.length === 11) {
    // Đã đúng: 84xxxxxxxxx
    normalized = digits
  } else if (digits.startsWith('0') && digits.length === 10) {
    // 0xxxxxxxxx → 84xxxxxxxxx
    normalized = '84' + digits.slice(1)
  } else if (digits.length === 9 && /^[35789]/.test(digits)) {
    // BẪY EXCEL: nuốt số 0 đầu → 9 chữ số đầu số di động VN
    normalized = '84' + digits
  } else if (digits.startsWith('840') && digits.length === 12) {
    // 8409xxxxxxx (đầu số sai double-prefix) → 84xxxxxxxxx
    normalized = '84' + digits.slice(3)
  } else {
    return null
  }

  // Bắt buộc kết quả: 11 chữ số bắt đầu "84"
  if (!/^84\d{9}$/.test(normalized)) return null

  return normalized
}

// ─── Parse date từ cell ───────────────────────────────────────────────────────
/**
 * Hỗ trợ: Date object | VN string "DD/MM/YYYY HH:mm:ss" | Excel serial number
 * Trả null nếu tất cả thất bại — KHÔNG loại bỏ SĐT vì lỗi metadata ngày.
 */
function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null

  // 1. Date object
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? null : v
  }

  // 2. Excel serial number (number, không phải 0)
  if (typeof v === 'number' && v > 0) {
    try {
      // XLSX.SSF.parse_date_code trả {y,m,d,H,M,S}
      const parsed = XLSX.SSF.parse_date_code(v)
      if (parsed) {
        return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H ?? 0, parsed.M ?? 0, parsed.S ?? 0))
      }
    } catch {
      // fall through
    }
    return null
  }

  // 3. String — thử ISO hoặc DD/MM/YYYY [HH:mm:ss]
  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (!trimmed) return null

    // ISO: "2026-01-15T08:30:00Z" hoặc "2026-01-15"
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const d = new Date(trimmed)
      return isNaN(d.getTime()) ? null : d
    }

    // VN: "15/01/2026 08:30:00" hoặc "15/01/2026"
    const vnMatch = trimmed.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    )
    if (vnMatch) {
      const [, dd, mm, yyyy, hh = '0', min = '0', ss = '0'] = vnMatch
      const d = new Date(
        Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min, +ss)
      )
      return isNaN(d.getTime()) ? null : d
    }

    return null
  }

  return null
}

// ─── Heuristic: tìm cột SĐT ──────────────────────────────────────────────────
function detectPhoneColumn(rows: unknown[][]): number {
  if (rows.length === 0) return 0

  // Dùng tối đa 50 dòng mẫu để tăng tốc
  const sample = rows.slice(0, Math.min(50, rows.length))
  const colCount = Math.max(...sample.map(r => r.length))

  let bestCol = 0
  let bestRate = 0

  for (let c = 0; c < colCount; c++) {
    const vals = sample
      .map(r => r[c])
      .filter(v => v !== null && v !== undefined && String(v).trim() !== '')

    if (vals.length === 0) continue

    const matches = vals.filter(v => {
      const stripped = String(v).replace(/[^\d+]/g, '')
      return /^(\+?84|0)\d{8,10}$/.test(stripped) ||
             /^\d{9}$/.test(stripped)  // 9-digit (Excel nuốt số 0)
    })

    const rate = matches.length / vals.length
    if (rate > bestRate) {
      bestRate = rate
      bestCol = c
    }
  }

  return bestRate >= 0.8 ? bestCol : -1
}

// ─── Tìm cột thời gian ────────────────────────────────────────────────────────
function detectDateColumns(headers: unknown[], rows: unknown[][]): number[] {
  if (rows.length === 0) return []
  const sample = rows.slice(0, Math.min(30, rows.length))
  const colCount = headers.length

  const dateCols: number[] = []
  for (let c = 0; c < colCount; c++) {
    const vals = sample.map(r => r[c]).filter(v => v !== null && v !== undefined && v !== '')
    if (vals.length === 0) continue
    const dateHits = vals.filter(v => parseDate(v) !== null)
    if (dateHits.length / vals.length >= 0.5) dateCols.push(c)
  }
  return dateCols
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Kiểm tra file
  if (!fs.existsSync(filePath)) {
    process.stderr.write(`[ERROR] File không tồn tại: ${filePath}\n`)
    process.exit(1)
  }

  console.log(`\n📂 Đang đọc: ${filePath}`)
  if (isDry) console.log('🔍 Chế độ: DRY-RUN (không ghi DB)\n')
  else console.log('🚀 Chế độ: LIVE (sẽ ghi Supabase)\n')

  // 2. Đọc workbook
  const workbook = XLSX.readFile(filePath, { cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // header:1 → rows là array-of-arrays, dòng 0 là header
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })
  if (rawRows.length < 2) {
    console.log('⚠️  Sheet trống hoặc chỉ có header. Không có gì để import.')
    return
  }

  const headerRow = rawRows[0] as unknown[]
  const dataRows  = rawRows.slice(1) as unknown[][]

  // 3. Tự động dò cột SĐT
  const phoneCol = detectPhoneColumn(dataRows)
  if (phoneCol === -1) {
    process.stderr.write('[ERROR] Không tìm được cột SĐT (heuristic < 80%). Kiểm tra file.\n')
    process.exit(1)
  }
  const dateCols = detectDateColumns(headerRow, dataRows)
  console.log(`📌 Cột SĐT: index ${phoneCol} ("${headerRow[phoneCol]}")`)
  console.log(`📌 Cột ngày: ${dateCols.map(c => `${c}("${headerRow[c]}")`).join(', ') || 'không phát hiện'}`)
  console.log()

  // 4. Gom dữ liệu: Map<phone, {first_seen, last_seen}>
  const contactMap = new Map<string, { first_seen: Date | null; last_seen: Date | null }>()
  let invalid = 0
  const invalidSamples: string[] = []  // raw strings, tối đa 100

  for (const row of dataRows) {
    const rawPhone = row[phoneCol]
    // Dòng trống → skip im lặng (không tính vào invalid)
    if (rawPhone === null || rawPhone === undefined || String(rawPhone).trim() === '') continue
    const phone = normalizePhone(rawPhone)

    if (!phone) {
      invalid++
      if (invalidSamples.length < 100) {
        // Chỉ ghi dạng masked: không ghi SĐT thô
        invalidSamples.push(`[INVALID] length=${String(rawPhone ?? '').length} type=${typeof rawPhone}`)
      }
      continue
    }

    // Gom dates
    let rowFirst: Date | null = null
    let rowLast:  Date | null = null
    for (const dc of dateCols) {
      const d = parseDate(row[dc])
      if (!d) continue
      if (!rowFirst || d < rowFirst) rowFirst = d
      if (!rowLast  || d > rowLast)  rowLast  = d
    }

    const existing = contactMap.get(phone)
    if (!existing) {
      contactMap.set(phone, { first_seen: rowFirst, last_seen: rowLast })
    } else {
      // Min first_seen, Max last_seen
      if (rowFirst) {
        if (!existing.first_seen || rowFirst < existing.first_seen) existing.first_seen = rowFirst
      }
      if (rowLast) {
        if (!existing.last_seen || rowLast > existing.last_seen) existing.last_seen = rowLast
      }
    }
  }

  // 5. Ghi invalid samples ra file (không log SĐT thô ra console)
  if (invalidSamples.length > 0) {
    const invalidPath = path.resolve(process.cwd(), './data/invalid-phones.txt')
    fs.writeFileSync(invalidPath, invalidSamples.join('\n') + '\n', 'utf-8')
    console.log(`⚠️  ${invalid} SĐT không hợp lệ. Mẫu lỗi: ./data/invalid-phones.txt`)
  }

  // 6. Chuẩn bị mảng upsert
  const contacts: ContactRow[] = Array.from(contactMap.entries()).map(([phone, ts]) => ({
    phone,
    source:     'sms_log',
    first_seen: ts.first_seen,
    last_seen:  ts.last_seen,
  }))

  // 7. Báo cáo thống kê (luôn in)
  const totalInputRows  = dataRows.filter(r => {
    const v = r[phoneCol]
    return v !== null && v !== undefined && String(v).trim() !== ''
  }).length
  const duplicatesInFile = totalInputRows - invalid - contacts.length
  console.log('─────────────────────────────────────────')
  console.log('📊 BÁO CÁO THỐNG KÊ')
  console.log(`   Tổng dòng dữ liệu (có SĐT):  ${totalInputRows}`)
  console.log(`   Hợp lệ (unique):              ${contacts.length}`)
  console.log(`   Trùng lặp gom vào 1 entry:    ${duplicatesInFile}`)
  console.log(`   Không hợp lệ (bị bỏ qua):    ${invalid}`)
  console.log('─────────────────────────────────────────')

  if (isDry) {
    console.log('\n✅ DRY-RUN hoàn tất. Không có gì được ghi vào DB.')
    return
  }

  // 8. Ghi Supabase (chỉ LIVE mode)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    process.stderr.write('[ERROR] Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local\n')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const CHUNK_SIZE = 500
  let upserted = 0
  let errors   = 0

  for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
    const chunk = contacts.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase
      .from('audience_contacts')
      .upsert(chunk, { onConflict: 'phone' })

    if (error) {
      process.stderr.write(`[CHUNK ${i / CHUNK_SIZE + 1}] Lỗi: ${error.message}\n`)
      errors += chunk.length
    } else {
      upserted += chunk.length
      process.stdout.write(`  ↳ Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: +${chunk.length} (tổng ${upserted})\r`)
    }
  }

  console.log(`\n✅ UPSERT hoàn tất: ${upserted} thành công, ${errors} lỗi.`)
}

main().catch(err => {
  process.stderr.write('[FATAL] ' + String(err) + '\n')
  process.exit(1)
})
