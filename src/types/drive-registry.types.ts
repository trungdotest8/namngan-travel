export type DriveFolderType = 'root_tours' | 'domestic' | 'international' | 'country' | 'tour'

export interface DriveFolderRegistry {
  id:          string
  path_key:    string             // 'root' | 'domestic' | 'international' | 'international/NHẬT BẢN'
  folder_type: DriveFolderType
  drive_id:    string
  drive_url:   string
  parent_path: string | null
  created_at:  string
}
