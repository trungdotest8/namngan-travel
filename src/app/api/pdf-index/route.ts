import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PdfSearchResult } from '@/types/pdf-index.types'

// GET /api/pdf-index?q=<query>&limit=<n>&tour_code=<optional>
//
// Child A dùng route này để tìm kiếm nội dung PDF lịch trình.
// Tận dụng GIN index trên extracted_text với to_tsquery('simple').
//
// Ví dụ:
//   GET /api/pdf-index?q=vịnh+hạ+long+cáp+treo
//   → trả về các PDF có mention cáp treo ở Hạ Long

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q         = searchParams.get('q')?.trim() ?? ''
  const limit     = Math.min(Number(searchParams.get('limit') ?? '10'), 20)
  const tourCode  = searchParams.get('tour_code')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: 'Query quá ngắn — tối thiểu 2 ký tự' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()

    // Chuyển query thành tsquery (dùng plain để an toàn với tiếng Việt)
    // to_tsquery('simple', 'hà nội') → 'hà' & 'nội'
    // Dùng RPC hoặc raw SQL qua .rpc()
    const { data, error } = await supabase
      .rpc('search_pdf_index', {
        search_query: q,
        result_limit: limit,
        filter_code:  tourCode ?? null,
      })

    if (error) {
      // Fallback: ILIKE nếu FTS RPC chưa tồn tại
      console.warn('[pdf-index] FTS RPC unavailable, falling back to ILIKE:', error.message)

      let query = supabase
        .from('tour_pdf_index')
        .select('tour_code, tour_name, google_drive_link, pdf_title, summary, crawled_at')
        .ilike('extracted_text', `%${q}%`)
        .not('google_drive_link', 'is', null)
        .order('crawled_at', { ascending: false })
        .limit(limit)

      if (tourCode) query = query.eq('tour_code', tourCode)

      const { data: fallbackData, error: fallbackErr } = await query

      if (fallbackErr) throw fallbackErr

      const results: PdfSearchResult[] = (fallbackData ?? []).map((row) => ({
        tour_code:         row.tour_code,
        tour_name:         row.tour_name,
        google_drive_link: row.google_drive_link,
        pdf_title:         row.pdf_title,
        summary:           row.summary,
        crawled_at:        row.crawled_at,
        rank:              0,
      }))

      return NextResponse.json({ results, total: results.length, source: 'ilike' })
    }

    const results: PdfSearchResult[] = (data ?? []).map((row: PdfSearchResult) => ({
      tour_code:         row.tour_code,
      tour_name:         row.tour_name,
      google_drive_link: row.google_drive_link,
      pdf_title:         row.pdf_title,
      summary:           row.summary,
      crawled_at:        row.crawled_at,
      rank:              row.rank ?? 0,
    }))

    return NextResponse.json({ results, total: results.length, source: 'fts' })

  } catch (err) {
    console.error('[pdf-index API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
