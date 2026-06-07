import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export interface AffiliateLink {
  id:              string
  provider:        string
  product_type:    string
  label:           string
  destination:     string | null
  tracking_url:    string
  base_url:        string
  commission_rate: number
  is_active:       boolean
}

export interface TrackClickParams {
  link_id:    string
  lead_id?:   string | null
  session_id?: string | null
  ip?:        string | null
  referrer?:  string | null
  user_agent?: string | null
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function getActiveLinks(filters?: {
  provider?: string
  product_type?: string
  destination?: string
}): Promise<AffiliateLink[]> {
  const supabase = adminClient()
  let query = supabase
    .from('affiliate_links')
    .select('*')
    .eq('is_active', true)
    .order('commission_rate', { ascending: false })

  if (filters?.provider)     query = query.eq('provider', filters.provider)
  if (filters?.product_type) query = query.eq('product_type', filters.product_type)
  if (filters?.destination)  query = query.eq('destination', filters.destination)

  const { data, error } = await query
  if (error) throw new Error(`getActiveLinks: ${error.message}`)
  return (data ?? []) as AffiliateLink[]
}

export async function recordClick(params: TrackClickParams): Promise<void> {
  const supabase = adminClient()
  const ip_hash = params.ip
    ? crypto.createHash('sha256').update(params.ip).digest('hex')
    : null

  const { error } = await supabase.from('affiliate_clicks').insert({
    link_id:    params.link_id,
    lead_id:    params.lead_id ?? null,
    session_id: params.session_id ?? null,
    ip_hash,
    referrer:   params.referrer ?? null,
    user_agent: params.user_agent ?? null,
  })

  if (error) throw new Error(`recordClick: ${error.message}`)
}

export async function getLinkById(id: string): Promise<AffiliateLink | null> {
  const supabase = adminClient()
  const { data, error } = await supabase
    .from('affiliate_links')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error) return null
  return data as AffiliateLink
}
