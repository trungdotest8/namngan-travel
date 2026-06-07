import { createClient } from '@supabase/supabase-js'

export interface RelevantTour {
  id:            string
  name:          string
  destination:   string | null
  country:       string | null
  category:      string | null
  duration_days: number | null
  description:   string | null
  highlights:    string | null
}

// Vietnamese + English stop words không có giá trị tìm kiếm
const STOP_WORDS = new Set([
  'tôi', 'bạn', 'cho', 'muốn', 'được', 'với', 'này', 'đó', 'có', 'không',
  'và', 'của', 'từ', 'đến', 'về', 'trong', 'ngoài', 'tour', 'đi', 'du',
  'lịch', 'ngày', 'tháng', 'năm', 'người', 'giá', 'tiền', 'hãy', 'làm',
  'thể', 'vậy', 'nếu', 'khi', 'sau', 'trước', 'cần', 'nên', 'được',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'was',
  'one', 'our', 'out', 'day', 'get', 'has', 'how', 'new', 'now', 'see',
  'trip', 'travel', 'want',
])

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    // giữ lại chữ cái Latin, Unicode có dấu (tiếng Việt), khoảng trắng
    .replace(/[^\wàáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
    .slice(0, 6) // tối đa 6 keyword để tránh query quá phức tạp
}

/**
 * Tìm 3-5 tour liên quan nhất từ Supabase dựa trên query text.
 * Dùng ILIKE trên name/destination/country — edge-compatible (không dùng @supabase/ssr).
 * Trả về [] nếu không tìm thấy hoặc Supabase chưa cấu hình.
 */
export async function searchRelevantTours(query: string): Promise<RelevantTour[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return []

  const keywords = extractKeywords(query)
  if (keywords.length === 0) return []

  // tạo OR conditions: mỗi keyword kiểm tra trên 3 cột
  const orConditions = keywords
    .flatMap(kw => [
      `name.ilike.%${kw}%`,
      `destination.ilike.%${kw}%`,
      `country.ilike.%${kw}%`,
    ])
    .join(',')

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase
      .from('tours')
      .select('id, name, destination, country, category, duration_days, description, highlights')
      .or(orConditions)
      .eq('is_active', true)
      .limit(5)

    if (error || !data) return []
    return data as RelevantTour[]
  } catch {
    return []
  }
}
