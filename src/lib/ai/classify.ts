import Anthropic from '@anthropic-ai/sdk'

export type LeadTier = 'hot' | 'warm' | 'cold'

export interface ClassifyResult {
  tier:      LeadTier
  ai_tags:   string[]   // tối đa 5 tag ngắn, ví dụ: ["Nhật Bản", "budget cao", "nhóm gia đình"]
  reasoning: string     // 1 câu giải thích — dùng để log/debug
}

export interface LeadForClassify {
  lead_score:           number
  destination_interest: string | null
  budget_range:         string | null
  travel_date:          string | null
  number_of_people:     number | null
  travel_style:         string | null
  message:              string | null
  lead_source:          string | null
  source_channel:       string | null
}

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích lead du lịch của Nam Ngân Travel.
Nhiệm vụ: phân loại lead thành hot/warm/cold và gán tags ngắn gọn.

Tiêu chí phân loại:
- HOT: Điền đủ điểm đến + ngân sách + ngày đi, lead_score ≥ 60, hoặc thể hiện ý định mua rõ ràng trong message.
- WARM: Có điểm đến hoặc ngân sách, lead_score 30–59, quan tâm nhưng chưa sẵn sàng ngay.
- COLD: Thông tin tối thiểu, lead_score < 30, không rõ nhu cầu.

Trả về JSON hợp lệ (không có markdown, không có text ngoài JSON):
{
  "tier": "hot" | "warm" | "cold",
  "ai_tags": ["tag1", "tag2"],  // tối đa 5 tag, mỗi tag ≤ 20 ký tự, tiếng Việt hoặc tên điểm đến
  "reasoning": "1 câu ngắn bằng tiếng Việt"
}`

let anthropic: Anthropic | null = null

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Classify] ANTHROPIC_API_KEY chưa cấu hình — bỏ qua classify')
    return null
  }
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return anthropic
}

export async function classifyLead(lead: LeadForClassify): Promise<ClassifyResult> {
  const client = getClient()

  // Fallback khi không có API key: rule-based đơn giản
  if (!client) return ruleBased(lead)

  const userContent = JSON.stringify({
    lead_score:           lead.lead_score,
    destination_interest: lead.destination_interest,
    budget_range:         lead.budget_range,
    travel_date:          lead.travel_date,
    number_of_people:     lead.number_of_people,
    travel_style:         lead.travel_style,
    message:              lead.message?.slice(0, 300),
    lead_source:          lead.lead_source,
    source_channel:       lead.source_channel,
  })

  try {
    const res = await client.messages.create({
      model:      'claude-opus-4-8',
      max_tokens: 256,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userContent }],
    })

    const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : ''
    const parsed = JSON.parse(text) as { tier: LeadTier; ai_tags: string[]; reasoning: string }

    return {
      tier:      ['hot', 'warm', 'cold'].includes(parsed.tier) ? parsed.tier : 'warm',
      ai_tags:   Array.isArray(parsed.ai_tags) ? parsed.ai_tags.slice(0, 5) : [],
      reasoning: parsed.reasoning ?? '',
    }
  } catch (err) {
    console.error('[Classify] Claude error, fallback rule-based:', err)
    return ruleBased(lead)
  }
}

// Rule-based fallback khi không có API key hoặc Claude thất bại
function ruleBased(lead: LeadForClassify): ClassifyResult {
  const score = lead.lead_score ?? 0
  const tags: string[] = []

  if (lead.destination_interest) tags.push(lead.destination_interest.split(',')[0].trim().slice(0, 20))
  if (lead.budget_range)         tags.push(lead.budget_range.slice(0, 20))
  if (lead.travel_style)         tags.push(lead.travel_style.slice(0, 20))

  if (score >= 60 || (lead.destination_interest && lead.budget_range && lead.travel_date)) {
    return { tier: 'hot', ai_tags: tags, reasoning: 'Rule-based: đủ thông tin quan trọng' }
  }
  if (score >= 30 || lead.destination_interest || lead.budget_range) {
    return { tier: 'warm', ai_tags: tags, reasoning: 'Rule-based: có thông tin cơ bản' }
  }
  return { tier: 'cold', ai_tags: tags, reasoning: 'Rule-based: thông tin tối thiểu' }
}
