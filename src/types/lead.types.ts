export type LeadSource = 'popup' | 'chat' | 'fb_ads' | 'web_ads' | 'organic' | 'other'

// 6 giá trị gốc + 4 giá trị CRM (migration 20250530000003)
export type LeadStatus =
  | 'new' | 'contacted' | 'consulting' | 'deposited' | 'converted' | 'lost'
  | 'contact' | 'booked' | 'done' | 'cancel'

export interface Lead {
  id:                string
  full_name:         string
  phone:             string
  email:             string | null
  message:           string | null
  tour_id:           string | null
  source_page:       string | null
  lead_source:       LeadSource | null
  utm_source:        string | null    // "facebook" | "google"
  utm_medium:        string | null    // "cpc" | "banner"
  utm_campaign:      string | null
  image_attachments: string[] | null  // Supabase Storage URLs
  google_drive_url:  string | null
  status:            LeadStatus
  assigned_to:       string | null    // users.id
  note:              string | null
  // CRM extension columns (migration 20250530000003)
  name:              string | null
  source:            string | null
  score:             number | null
  campaign:          string | null
  tour:              string | null
  city:              string | null
  budget:            number | null
  pax:               number | null
  fb_lead_id:        string | null
  fb_page_id:        string | null
  fb_form_id:        string | null
  created_at:        string
  updated_at:        string
}

export interface LeadFormData {
  full_name:   string
  phone:       string
  email?:      string
  message?:    string
  tour_id?:    string
  lead_source: LeadSource
}
