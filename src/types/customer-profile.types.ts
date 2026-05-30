// Child D — Hồ sơ khách hàng
// Dữ liệu ảnh/Drive lưu trực tiếp trên bảng leads (image_attachments, google_drive_url)

export interface CustomerProfile {
  id:               string
  lead_id:          string        // leads.id
  full_name:        string
  phone:            string
  email:            string | null
  avatar_url:       string | null // Supabase Storage URL (ảnh đại diện)
  image_attachments: string[]     // Supabase Storage URLs (hồ sơ đính kèm)
  google_drive_url: string | null // Google Drive folder URL
  drive_synced:     boolean
  note:             string | null
  created_at:       string
  updated_at:       string
}

export interface FileUploadResult {
  url:       string
  path:      string
  size:      number
  mime_type: string
}

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'
