#!/usr/bin/env node
// Seed dữ liệu tour trong nước cho Nam Ngân Travel
// Chạy: node scripts/seed-domestic-tours.mjs

const SUPABASE_URL = 'https://indjoegnsvcteaozmgrg.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZGpvZWduc3ZjdGVhb3ptZ3JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDExNzUyMywiZXhwIjoyMDk1NjkzNTIzfQ.mEGWI8AqWCKajw9REdJ2iDS6zv_PfIbEU16OJNJn1Rs'

const HEADERS = {
  'apikey':       SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer':       'return=representation',
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ── 8 tour trong nước ─────────────────────────────────────────────────────────
const TOURS = [
  {
    code: 'NN-TN-001',
    name: 'HẠ LONG - TUẦN CHÂU 3N2Đ',
    destination: 'HẠ LONG - QUẢNG NINH',
    duration_days: 3,
    description: 'Khám phá vịnh Hạ Long - Di sản Thiên nhiên Thế giới với hàng nghìn hòn đảo đá vôi kỳ vĩ. Nghỉ ngơi tại Tuần Châu, tham quan hang Sửng Sốt, chèo kayak khám phá hang động.',
    highlights: JSON.stringify(['Vịnh Hạ Long - Di sản UNESCO', 'Hang Sửng Sốt - Hang Thiên Cung', 'Chèo Kayak khám phá hang động', 'Nghỉ đêm trên du thuyền', 'Đảo Ti Tốp - tắm biển']),
  },
  {
    code: 'NN-TN-002',
    name: 'ĐÀ NẴNG - HỘI AN - BÀ NÀ 4N3Đ',
    destination: 'ĐÀ NẴNG - HỘI AN',
    duration_days: 4,
    description: 'Hành trình miền Trung hấp dẫn từ Đà Nẵng sôi động đến phố cổ Hội An nên thơ và thiên đường Bà Nà Hills trên đỉnh núi.',
    highlights: JSON.stringify(['Cầu Vàng - Bà Nà Hills', 'Phố cổ Hội An về đêm', 'Bãi biển Mỹ Khê', 'Ngũ Hành Sơn - Cẩm Nam', 'Bảo tàng điêu khắc Chăm']),
  },
  {
    code: 'NN-TN-003',
    name: 'PHÚ QUỐC - ĐẢO NGỌC 3N2Đ',
    destination: 'PHÚ QUỐC - KIÊN GIANG',
    duration_days: 3,
    description: 'Trải nghiệm thiên đường nhiệt đới Phú Quốc với bãi biển cát trắng, nước biển trong xanh và ẩm thực hải sản tươi ngon.',
    highlights: JSON.stringify(['Bãi Sao - bãi biển đẹp nhất', 'Cáp treo Hòn Thơm vượt biển', 'Làng chài Hàm Ninh', 'Chợ đêm Phú Quốc', 'Vinpearl Safari']),
  },
  {
    code: 'NN-TN-004',
    name: 'SAPA - FANSIPAN - BẰNG LĂNG 3N2Đ',
    destination: 'SAPA - LÀO CAI',
    duration_days: 3,
    description: 'Chinh phục nóc nhà Đông Dương Fansipan bằng cáp treo, khám phá bản làng người H\'Mông, ngắm ruộng bậc thang mùa lúa chín.',
    highlights: JSON.stringify(['Cáp treo Fansipan 3.143m', 'Bản Cát Cát - H\'Mông Black', 'Ruộng bậc thang Mù Cang Chải', 'Thác Bạc - Cầu Mây', 'Chợ tình Sapa']),
  },
  {
    code: 'NN-TN-005',
    name: 'NHA TRANG - VINPEARL 3N2Đ',
    destination: 'NHA TRANG - KHÁNH HÒA',
    duration_days: 3,
    description: 'Thành phố biển Nha Trang với bãi biển xanh mướt, công viên giải trí Vinpearl đẳng cấp và ẩm thực hải sản phong phú.',
    highlights: JSON.stringify(['Vinpearl Land - Cáp treo biển', 'Tháp Bà Ponagar - di tích Chăm', 'Bãi biển Nha Trang - lặn san hô', 'Đảo Hòn Mun - san hô nhiều màu', 'Chợ Đầm - mua sắm đặc sản']),
  },
  {
    code: 'NN-TN-006',
    name: 'ĐÀ LẠT - THÀNH PHỐ NGÀN HOA 3N2Đ',
    destination: 'ĐÀ LẠT - LÂM ĐỒNG',
    duration_days: 3,
    description: 'Thành phố ngàn hoa Đà Lạt với khí hậu mát mẻ quanh năm, những vườn dâu, thác nước và kiến trúc Pháp cổ kính.',
    highlights: JSON.stringify(['Thung lũng Tình Yêu', 'Hồ Tuyền Lâm - cáp treo', 'Vườn hoa thành phố', 'Thác Datanla - phiêu lưu', 'Làng bích họa Hòa An']),
  },
  {
    code: 'NN-TN-007',
    name: 'HÀ GIANG - CAO NGUYÊN ĐÁ ĐỒNG VĂN 4N3Đ',
    destination: 'HÀ GIANG',
    duration_days: 4,
    description: 'Cung đường Hà Giang hùng vĩ với Cao nguyên Đá Đồng Văn, đèo Mã Pì Lèng dựng đứng trên vực thẳm và văn hóa các dân tộc H\'Mông.',
    highlights: JSON.stringify(['Đèo Mã Pì Lèng - hùng vĩ nhất VN', 'Cao nguyên Đá Đồng Văn - UNESCO', 'Cột cờ Lũng Cú - điểm cực Bắc', 'Phố cổ Đồng Văn', 'Làng văn hóa người H\'Mông']),
  },
  {
    code: 'NN-TN-008',
    name: 'CÔN ĐẢO - ĐẢO THIÊN ĐƯỜNG 3N2Đ',
    destination: 'CÔN ĐẢO - BÀ RỊA VŨNG TÀU',
    duration_days: 3,
    description: 'Hòn đảo hoang sơ Côn Đảo với biển trong xanh, rùa biển đẻ trứng và khu di tích lịch sử Côn Lôn nổi tiếng.',
    highlights: JSON.stringify(['Bãi Đầm Trầu - trong xanh tuyệt đẹp', 'Vườn Quốc gia Côn Đảo', 'Nghĩa trang Hàng Dương', 'Lặn ngắm san hô', 'Xem rùa biển đẻ trứng (mùa hè)']),
  },
]

// ── Schedules (2–3 lịch / tour, bắt đầu từ 2026-06-15) ───────────────────────
function makeSchedules(tourId, durDays, priceAdult, priceChild) {
  const starts = ['2026-06-20', '2026-07-05', '2026-07-19', '2026-08-02']
  return starts.slice(0, 3).map(dep => {
    const ret = new Date(dep)
    ret.setDate(ret.getDate() + durDays - 1)
    return {
      tour_id:       tourId,
      departure_date: dep,
      return_date:   ret.toISOString().slice(0, 10),
      price_adult:   priceAdult,
      price_child:   priceChild,
      seats_total:   30,
      seats_booked:  0,
      status:        'open',
      transport:     'Máy bay + xe đưa đón',
      meeting_point: 'Sân bay Tân Sơn Nhất - TP.HCM',
    }
  })
}

const PRICE_MAP = {
  'NN-TN-001': [4_500_000, 3_200_000],
  'NN-TN-002': [5_800_000, 4_200_000],
  'NN-TN-003': [5_500_000, 3_800_000],
  'NN-TN-004': [4_800_000, 3_400_000],
  'NN-TN-005': [5_200_000, 3_600_000],
  'NN-TN-006': [3_900_000, 2_800_000],
  'NN-TN-007': [5_500_000, 3_900_000],
  'NN-TN-008': [7_500_000, 5_200_000],
}

async function rest(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} /rest/v1/${path} → ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

async function main() {
  console.log('\n[1/2] Inserting domestic tours...\n')

  const toInsert = TOURS.map(t => ({
    code:          t.code,
    name:          t.name,
    slug:          `${slugify(t.name)}-${t.code.toLowerCase()}`,
    destination:   t.destination,
    duration_days: t.duration_days,
    description:   t.description,
    highlights:    t.highlights,
    category:      'trong nước',
    country:       'VIỆT NAM',
    is_active:     true,
  }))

  // Upsert (conflict on code — idempotent)
  const inserted = await rest('POST', 'tours?on_conflict=code', toInsert)
  console.log(`  ✅ ${inserted.length} tours upserted`)
  inserted.forEach(t => console.log(`     ${t.code} — ${t.name} (id: ${t.id})`))

  console.log('\n[2/2] Inserting schedules...\n')

  const allSchedules = []
  for (const t of inserted) {
    const [pa, pc] = PRICE_MAP[t.code]
    const schedules = makeSchedules(t.id, t.duration_days, pa, pc)
    allSchedules.push(...schedules)
  }

  // Upsert schedules (conflict on tour_id + departure_date)
  const insertedSch = await rest('POST', 'tour_schedules?on_conflict=tour_id,departure_date', allSchedules)
  console.log(`  ✅ ${insertedSch.length} schedules upserted`)

  console.log('\n✅ Done! /tour-trong-nuoc sẽ hiển thị dữ liệu.\n')
}

main().catch(e => { console.error('✗ Error:', e.message); process.exit(1) })
