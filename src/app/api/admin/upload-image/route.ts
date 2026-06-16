import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/admin-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 })
    }

    const { base64Data, fileName, fileType } = await req.json()
    if (!base64Data || !fileName) {
      return NextResponse.json({ error: 'Missing file data' }, { status: 400 })
    }

    const buffer = Buffer.from(
      base64Data.replace(/^data:image\/\w+;base64,/, ''),
      'base64',
    )
    const cleanFileType = fileType || 'image/jpeg'
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${fileName}`
    const filePath = `tours/${uniqueFileName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('tour-galleries')
      .upload(filePath, buffer, { contentType: cleanFileType, upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('tour-galleries')
      .getPublicUrl(filePath)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
