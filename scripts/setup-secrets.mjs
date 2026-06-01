#!/usr/bin/env node
// Helper script: đọc .env.local → push secrets lên Vercel + Supabase
// Chạy từ root: node scripts/setup-secrets.mjs

import { execSync }                    from 'child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { resolve, dirname }            from 'path'
import { fileURLToPath }               from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')
const raw   = readFileSync(resolve(root, '.env.local'), 'utf8')

// ── Helpers ──────────────────────────────────────────────────────────────────
function getVar(key) {
  const m = new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm').exec(raw)
  return m ? m[1].trim() : null
}

function getJson(key) {
  const m = new RegExp(`${key}\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*\\n[A-Z_]`).exec(raw)
  if (!m) throw new Error(`${key} JSON block not found in .env.local`)
  return JSON.stringify(JSON.parse(m[1]))
}

function genSecret() {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

function vercelAdd(key, value, env = 'production') {
  console.log(`  vercel env add ${key} [${env}]`)
  execSync(`vercel env add ${key} ${env}`, {
    input: value,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
}

function supabaseSetSecrets(pairs) {
  const tmpFile = '/tmp/namngan-secrets.env'
  // Wrap value trong single quotes — tránh { " \ gây lỗi parser dotenv của supabase CLI
  // SA JSON không chứa single quote nên an toàn
  const content = Object.entries(pairs)
    .map(([k, v]) => `${k}='${v}'`)
    .join('\n')
  writeFileSync(tmpFile, content, 'utf8')
  console.log(`  supabase secrets set: ${Object.keys(pairs).join(', ')}`)
  try {
    // Dùng --linked (project phải đã link qua `supabase link --project-ref ...`)
    execSync(`supabase secrets set --env-file ${tmpFile} --linked`, { stdio: 'inherit' })
  } finally {
    try { unlinkSync(tmpFile) } catch {}
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const SA_JSON         = getJson('GOOGLE_SERVICE_ACCOUNT_JSON')
const DRIVE_FOLDER_ID = getVar('DRIVE_PARENT_FOLDER_ID')
const CRON_SECRET     = getVar('CRON_SECRET') ?? genSecret()

if (!DRIVE_FOLDER_ID) throw new Error('DRIVE_PARENT_FOLDER_ID not found in .env.local')

console.log('\n[1/2] Vercel env vars (production)...')
for (const [key, value] of [
  ['GOOGLE_SERVICE_ACCOUNT_JSON', SA_JSON],
  ['DRIVE_PARENT_FOLDER_ID',      DRIVE_FOLDER_ID],
  ['CRON_SECRET',                 CRON_SECRET],
]) {
  try { vercelAdd(key, value) } catch (e) { console.error(`  ✗ ${key}:`, e.message) }
}

console.log(`\n  CRON_SECRET (lưu lại nếu cần verify thủ công): ${CRON_SECRET}`)

console.log('\n[2/2] Supabase Edge Function secrets...')
try {
  supabaseSetSecrets({
    GOOGLE_SERVICE_ACCOUNT_JSON: SA_JSON,
    DRIVE_PARENT_FOLDER_ID:      DRIVE_FOLDER_ID,
  })
} catch (e) {
  console.error('  ✗ supabase secrets:', e.message)
}

console.log('\n✅ Done.\n')
