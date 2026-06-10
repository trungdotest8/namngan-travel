#!/usr/bin/env node
/**
 * Script download toàn bộ tour Trung Quốc từ trieuhaotravel.vn
 * Mỗi tour → 1 folder (tên tour) chứa 3 file đính kèm (PDF/DOCX/DOC)
 * Output: ./trieuhao-tours-tq/
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { URL } from 'url'

// ── Config ────────────────────────────────────────────────────

const SESSION_COOKIE = process.env.TRIEUHAO_SESSION_COOKIE ||
  '.HOIANEXPRESS=qS3Md6F1xzXV_uIx8p5_C5vmiBxQmRM1D1LbCSdZPBWwqf2Uh_QALf2JA2DGn-m7Ns4shKTep1vEdDUFkBXd4nljUVmKA82uadh6d0nrwDWuknuY-HosRXOghR6-EKJpI3m5jYe5OdXunvlsT-OBuGlycLtb7DruZX8KIAc9GnSYNHcXNdxNPVwsTdWZz29BfkS0xRl_QuiY1dHPWgrvcy8fF8mnEi5txxW5IEORKxdZ1RHZ9KWnK1gW5NymWKNRpS4rjA7lcQbuQFhfmvY5hoKDoQ9InaztuIXwDBVBB5RG9EuE8E7t71jXmGDVV1PnG6j6EPe3a2rViHwRSwOjTbNn3_V_ut_JbAKJqvZB8BukTtW3h8eHBHSQH2SO7zHd74-iZeYpv71ZpB5piEpCDGPm7s754f3iajU6vqXcCO4T2t-66-hz4cDcIo-RbHDLUBrv-EacmAs5AjQEjtOvlonItxEPaRdlQOj_0XCsJg0eiId60; HoiAnS=lzxqre244jqinf2w0ig03iv5; vantrung=D0FB1E95E5AFBEC7CC972C14459134316ED8788B983ADE19C40186DDF1FCB8D99294C82AF82D3CF800A0FFFF14C87F62747EEB2C7324826AA15E5DAC607CA3EFD9D8BB5EBD1FEAECB4ABA2F61FD78FD997D842874A69DEED83A198AE62F5E1F7760AA611'

const BASE_URL   = 'https://trieuhaotravel.vn'
const OUTPUT_DIR = './trieuhao-tours-tq'

// ── Helpers ───────────────────────────────────────────────────

function sanitizeFolderName(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function fetchJson(url, postBody) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: postBody ? 'POST' : 'GET',
      headers: {
        'Cookie': SESSION_COOKIE,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Referer': BASE_URL + '/DieuHanhTour/DatCho?TourId=TQ',
        ...(postBody ? { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } : {}),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('Invalid JSON: ' + data.slice(0, 200))) }
      })
    })
    req.on('error', reject)
    if (postBody) req.write(postBody)
    req.end()
  })
}

function downloadFile(fileUrl, destPath) {
  return new Promise((resolve, reject) => {
    const fullUrl = fileUrl.startsWith('http') ? fileUrl : BASE_URL + fileUrl
    const u = new URL(fullUrl)
    const mod = u.protocol === 'https:' ? https : http

    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'Cookie': SESSION_COOKIE,
        'User-Agent': 'Mozilla/5.0',
        'Referer': BASE_URL + '/DieuHanhTour/DatCho?TourId=TQ',
      },
    }

    const req = mod.request(options, (res) => {
      // Follow redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${fileUrl}`))
      }
      const file = fs.createWriteStream(destPath)
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
      file.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

function encodeBody(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Parse file links from TourShow HTML ──────────────────────

function parseFiles(tourShowHtml) {
  const files = []
  const re = /href="(\/Uploads\/files\/[^"]+\.(pdf|docx?|xls[xm]?))"[^>]*>\s*<b>([^<]+)<\/b>/gi
  let m
  while ((m = re.exec(tourShowHtml)) !== null) {
    files.push({ url: m[1], name: m[3].trim() })
  }
  return files
}

function parseTourName(tourShowHtml) {
  // Lấy tên từ data-original-title
  const m = tourShowHtml.match(/data-original-title="([^"]+)"/)
  if (m) return m[1]
  // Fallback: text từ <b> đầu tiên
  const m2 = tourShowHtml.match(/<b>([^<]+)<\/b>/)
  return m2 ? m2[1] : 'Không tên'
}

// ── Main ──────────────────────────────────────────────────────

async function fetchAllTours() {
  console.log('📡 Gọi Lists API…')
  const body = encodeBody({
    sEcho: '1',
    iDisplayStart: '0',
    iDisplayLength: '9999',
    Ngay: '09/06/2026 - 30/06/2026',
    TourId: 'TQ',
    NoiXuatPhatId: '1',
    DiaDiemId: '',
    TheLoaiId: '',
    MaLichTour: '',
  })
  const data = await fetchJson(BASE_URL + '/DieuHanhTour/DatCho/Lists', body)
  return data.aaData || []
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const rows = await fetchAllTours()
  console.log(`✅ Tổng số lịch: ${rows.length}`)

  // Dedupe theo TourId — giữ row đầu tiên (có đủ file nhất)
  const seen = new Map()
  for (const row of rows) {
    if (!seen.has(row.TourId)) {
      seen.set(row.TourId, row)
    } else {
      // Ưu tiên row có nhiều file hơn
      const existing = seen.get(row.TourId)
      const curFiles  = parseFiles(row.TourShow || '')
      const prevFiles = parseFiles(existing.TourShow || '')
      if (curFiles.length > prevFiles.length) seen.set(row.TourId, row)
    }
  }

  const tours = [...seen.values()]
  console.log(`\n📦 ${tours.length} tour unique. Bắt đầu download...\n`)

  const summary = []

  for (let i = 0; i < tours.length; i++) {
    const row = tours[i]
    const tourName = parseTourName(row.TourShow || '')
    const files    = parseFiles(row.TourShow || '')
    const folderName = sanitizeFolderName(tourName)
    const tourDir    = path.join(OUTPUT_DIR, folderName)

    console.log(`[${i + 1}/${tours.length}] 📁 ${folderName}`)

    if (!fs.existsSync(tourDir)) fs.mkdirSync(tourDir, { recursive: true })

    // Lưu metadata tour (thông tin cơ bản)
    const metaPath = path.join(tourDir, 'thong_tin_tour.txt')
    const metaContent = [
      `Tên tour  : ${tourName}`,
      `Tour ID   : ${row.TourId}`,
      `Lịch ID   : ${row.Id}`,
      `Mã lịch   : ${(row.MaLichTour || '').replace(/<[^>]+>/g, '').trim().slice(0, 200)}`,
      `Số chỗ    : ${(row.SoCho || '').replace(/<[^>]+>/g, '').trim()}`,
      `Thời gian : ${(row.ThoiGian || '').replace(/<[^>]+>/g, '').trim()}`,
      `Giá       : ${(row.ConLai || '').replace(/<[^>]+>/g, '').trim()}`,
      `Hoa hồng  : ${(row.HueHong || '').replace(/<[^>]+>/g, '').trim()}`,
      '',
      `Files đính kèm (${files.length}):`,
      ...files.map((f, idx) => `  ${idx + 1}. ${f.name} → ${f.url}`),
    ].join('\n')

    fs.writeFileSync(metaPath, metaContent, 'utf8')

    if (files.length === 0) {
      console.log(`   ⚠️  Không có file đính kèm`)
      summary.push({ tourName, status: 'no-files', downloaded: 0 })
      continue
    }

    let downloaded = 0
    for (const f of files) {
      const ext  = path.extname(f.url) || '.pdf'
      const dest = path.join(tourDir, sanitizeFolderName(f.name) + ext)

      // Skip nếu đã tồn tại
      if (fs.existsSync(dest)) {
        console.log(`   ✅ ${f.name} (already exists)`)
        downloaded++
        continue
      }

      try {
        await downloadFile(f.url, dest)
        const kb = Math.round(fs.statSync(dest).size / 1024)
        console.log(`   ⬇️  ${f.name} (${kb}KB)`)
        downloaded++
        await sleep(300) // polite delay
      } catch (err) {
        console.log(`   ❌ ${f.name}: ${err.message}`)
      }
    }

    summary.push({ tourName, status: 'ok', downloaded, total: files.length })
    await sleep(500)
  }

  // ── Summary ────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  console.log('📊 KẾT QUẢ DOWNLOAD')
  console.log('='.repeat(60))
  for (const s of summary) {
    const icon = s.status === 'no-files' ? '⚠️ ' : s.downloaded === s.total ? '✅' : '⚠️ '
    console.log(`${icon} ${s.tourName.slice(0, 60)} — ${s.downloaded ?? 0}/${s.total ?? 0} file`)
  }
  const total = summary.reduce((a, s) => a + (s.downloaded || 0), 0)
  console.log(`\n✅ Tổng: ${total} file đã tải về ${OUTPUT_DIR}/`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
