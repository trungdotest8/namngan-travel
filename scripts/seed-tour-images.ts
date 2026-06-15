/**
 * scripts/seed-tour-images.ts
 * Seed ảnh gallery vào cột tours.images (JSONB) cho tour được chỉ định bằng slug.
 *
 * Chạy: npx tsx scripts/seed-tour-images.ts --slug=<slug> --images="url1,url2,..."
 *       npx tsx scripts/seed-tour-images.ts --slug=<slug> --file=path/to/images.json
 *
 * Flags:
 *   --slug=<slug>           Slug của tour (bắt buộc)
 *   --images="url1,url2"   Danh sách URL phân cách bằng dấu phẩy (tối đa 8)
 *   --file=<path>          Đường dẫn file JSON chứa mảng string URL
 *
 * Validate: mỗi URL phải bắt đầu bằng https://, tối đa 8 URL.
 * Không tìm thấy slug → báo lỗi, không tạo tour mới.
 *
 * Env cần thiết (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import * as path from 'path'
import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

const MAX_IMAGES = 8

// ── Arg parser ────────────────────────────────────────────────────────────────

function parseArgs(): { slug: string; images: string[] } {
  const args = process.argv.slice(2)
  const get = (prefix: string) =>
    args.find(a => a.startsWith(prefix))?.slice(prefix.length) ?? null

  const slug    = get('--slug=')
  const rawUrls = get('--images=')
  const file    = get('--file=')

  if (!slug) {
    console.error('❌  --slug= là bắt buộc. Ví dụ: --slug=tour-nhat-ban-8n7d')
    process.exit(1)
  }

  let images: string[] = []

  if (rawUrls) {
    images = rawUrls.split(',').map(s => s.trim()).filter(Boolean)
  } else if (file) {
    const fullPath = path.resolve(process.cwd(), file)
    if (!fs.existsSync(fullPath)) {
      console.error(`❌  File không tìm thấy: ${fullPath}`)
      process.exit(1)
    }
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
      if (!Array.isArray(parsed)) {
        console.error('❌  File JSON phải là mảng string URL.')
        process.exit(1)
      }
      images = (parsed as unknown[]).filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
    } catch {
      console.error('❌  Không parse được file JSON.')
      process.exit(1)
    }
  } else {
    console.error('❌  Cần truyền --images="url1,url2" hoặc --file=path/to/images.json')
    process.exit(1)
  }

  return { slug, images }
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateImages(images: string[]): void {
  if (images.length === 0) {
    console.error('❌  Danh sách URL trống.')
    process.exit(1)
  }

  if (images.length > MAX_IMAGES) {
    console.error(`❌  Tối đa ${MAX_IMAGES} ảnh, nhận được ${images.length}.`)
    process.exit(1)
  }

  const invalid = images.filter(url => !url.startsWith('https://'))
  if (invalid.length > 0) {
    console.error('❌  Các URL sau không hợp lệ (phải bắt đầu bằng https://):')
    invalid.forEach(u => console.error(`   • ${u}`))
    process.exit(1)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌  Thiếu env: NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const { slug, images } = parseArgs()
  validateImages(images)

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })

  // Kiểm tra tour tồn tại
  const { data: tour, error: fetchErr } = await supabase
    .from('tours')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (fetchErr) {
    console.error('❌  Lỗi truy vấn Supabase:', fetchErr.message)
    process.exit(1)
  }

  if (!tour) {
    console.error(`❌  Không tìm thấy tour với slug="${slug}". Kiểm tra lại slug.`)
    process.exit(1)
  }

  // UPDATE images
  const { error: updateErr } = await supabase
    .from('tours')
    .update({ images: images })
    .eq('slug', slug)

  if (updateErr) {
    console.error('❌  Lỗi UPDATE Supabase:', updateErr.message)
    process.exit(1)
  }

  console.log(`✅  Đã set ${images.length} ảnh cho tour:`)
  console.log(`   Tên  : ${tour.name}`)
  console.log(`   Slug : ${tour.slug}`)
  console.log(`   Ảnh  :`)
  images.forEach((url, i) => console.log(`     [${i + 1}] ${url}`))
}

main().catch(err => {
  console.error('❌  Lỗi không xác định:', err)
  process.exit(1)
})
