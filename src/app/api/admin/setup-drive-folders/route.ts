import { NextResponse } from 'next/server'
import { z } from 'zod'
import { COUNTRY_MAP } from '@/lib/tour-country'

const Schema = z.object({
  dry_run: z.boolean().default(false),
})

// Thứ tự tạo folder: root → domestic → international → từng nước
const FOLDER_TREE = [
  { path_key: 'root',          folder_name: '[Tour Lịch Trình]', folder_type: 'root_tours', parent_path: null },
  { path_key: 'domestic',      folder_name: 'Trong Nước',        folder_type: 'domestic',   parent_path: 'root' },
  { path_key: 'international', folder_name: 'Nước Ngoài',        folder_type: 'international', parent_path: 'root' },
  ...Object.keys(COUNTRY_MAP).map(country => ({
    path_key:    `international/${country}`,
    folder_name: country,
    folder_type: 'country' as const,
    parent_path: 'international',
  })),
]

export async function POST(request: Request) {
  // Auth guard
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { dry_run } = parsed.data

    if (dry_run) {
      return NextResponse.json({
        dry_run: true,
        would_create: FOLDER_TREE.map(f => f.path_key),
        total: FOLDER_TREE.length,
      })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const edgeFnUrl   = `${supabaseUrl}/functions/v1/google-drive/create-tour-pdf-folder`

    const created: string[] = []
    const skipped: string[] = []
    const errors:  string[] = []

    // Tạo từng folder theo thứ tự (root → domestic/international → countries)
    // Cần drive_id của parent để set parent_folder_id cho child
    const driveIdCache: Record<string, string> = {}

    for (const folder of FOLDER_TREE) {
      try {
        const parent_drive_id = folder.parent_path
          ? driveIdCache[folder.parent_path]
          : process.env.DRIVE_PARENT_FOLDER_ID

        const res = await fetch(edgeFnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            folder_name:       folder.folder_name,
            parent_folder_id:  parent_drive_id ?? '',
            path_key:          folder.path_key,
            folder_type:       folder.folder_type,
            parent_path:       folder.parent_path ?? '',
          }),
        })

        if (!res.ok) {
          const detail = await res.text()
          errors.push(`${folder.path_key}: HTTP ${res.status} — ${detail}`)
          continue
        }

        const data = await res.json() as { drive_id: string; already_existed: boolean }

        // Cache drive_id cho folder này (dùng làm parent của folder con)
        driveIdCache[folder.path_key] = data.drive_id

        if (data.already_existed) {
          skipped.push(folder.path_key)
        } else {
          created.push(folder.path_key)
        }
      } catch (err) {
        errors.push(`${folder.path_key}: ${err}`)
      }
    }

    return NextResponse.json({ created, skipped, errors, total: FOLDER_TREE.length })
  } catch (err) {
    console.error('[POST /api/admin/setup-drive-folders]', err)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
