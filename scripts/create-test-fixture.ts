/**
 * scripts/create-test-fixture.ts
 * Sinh file ./data/sms-log.test.xlsx chứa đủ các ca thử nghiệm.
 * Chạy: npx tsx scripts/create-test-fixture.ts
 */

import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs   from 'fs'

const outPath = path.resolve(process.cwd(), './data/sms-log.test.xlsx')
fs.mkdirSync(path.dirname(outPath), { recursive: true })

// Excel serial number cho 2026-01-10 08:30:00 (UTC)
// Excel epoch = 1899-12-30; 2026-01-10 = 45667 ngày
const EXCEL_SERIAL_20260110 = 45667 + (8.5 / 24)   // ~45667.354

// Dòng header
const headers = ['ho_ten', 'sdt', 'ngay_gui', 'ngay_phan_hoi']

const rows: unknown[][] = [
  // 1. Số chuẩn 84... (11 chữ số)
  ['Nguyễn Văn A', '84973168492', '2026-01-05T07:00:00Z', '2026-01-10T10:00:00Z'],

  // 2. Số dạng 0... (10 chữ số)
  ['Trần Thị B', '0912345678', '15/01/2026 08:30:00', '20/01/2026 14:00:00'],

  // 3. BẪY EXCEL: 9 chữ số (mất số 0 đầu) — Excel nuốt số 0
  ['Lê Văn C', 973168492, '2026-02-01T06:00:00Z', ''],  // number, 9 digits

  // 4. Số rác có chữ cái — phải bị đếm vào invalid
  ['Phạm D', 'abc123xyz', '2026-03-01', ''],

  // 5. Trùng SĐT với dòng 1 (84973168492) — first_seen min, last_seen max
  ['Nguyễn Văn A (lần 2)', '84973168492', '2026-01-01T00:00:00Z', '2026-02-15T23:59:00Z'],

  // 6. Số +84... (dấu +)
  ['Hoàng E', '+84905111222', '2026-04-01T09:00:00Z', null],

  // 7. ngay_gui là Date object — xlsx cellDates:true sẽ giữ Date
  ['Vũ F', '0988776655', new Date('2026-05-01T03:00:00Z'), '2026-05-15T12:00:00Z'],

  // 8. ngay_gui là Excel serial number
  ['Đặng G', '0977001122', EXCEL_SERIAL_20260110, '2026-01-20T08:00:00Z'],

  // 9. Số hợp lệ thứ ba (chưa xuất hiện)
  ['Bùi H', '0866999888', '01/06/2026 07:00:00', ''],

  // 10. Ô SĐT rỗng — phải bỏ qua im lặng
  ['Không có SĐT', '', '2026-06-01', ''],
]

const wsData = [headers, ...rows]
const ws     = XLSX.utils.aoa_to_sheet(wsData)
const wb     = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
XLSX.writeFile(wb, outPath)

console.log(`✅ Fixture đã tạo: ${outPath}`)
console.log(`   ${rows.length} dòng dữ liệu`)
console.log()
console.log('Ca thử nghiệm:')
console.log('  Dòng 1: 84973168492 (chuẩn)')
console.log('  Dòng 2: 0912345678 → 84912345678')
console.log('  Dòng 3: 973168492 (9 digits) → 84973168492  [trùng dòng 1+5 → gom min/max]')
console.log('  Dòng 4: "abc123xyz" → invalid')
console.log('  Dòng 5: 84973168492 trùng dòng 1 → first_seen = min(5/1, 10/1) = 1/1; last_seen = max(10/1, 15/2)')
console.log('  Dòng 6: +84905111222 → 84905111222')
console.log('  Dòng 7: 0988776655 → 84988776655, ngày là Date object')
console.log('  Dòng 8: 0977001122 → 84977001122, ngày là Excel serial')
console.log('  Dòng 9: 0866999888 → 84866999888')
console.log('  Dòng 10: SĐT rỗng → bỏ qua')
console.log()
console.log('Kết quả kỳ vọng DRY-RUN:')
console.log('  Tổng dòng có SĐT: 9 (dòng 10 SĐT rỗng → skip im lặng, không tính)')
console.log('  Unique hợp lệ:    6 ({84973168492, 84912345678, 84905111222, 84988776655, 84977001122, 84866999888})')
console.log('  Trùng gom:        2 (dòng 3+5 trùng vào dòng 1 → 1 entry, 2 duplicates)')
console.log('  Invalid:          1 (dòng 4 "abc123xyz")')
