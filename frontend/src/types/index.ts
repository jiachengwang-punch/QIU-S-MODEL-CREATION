export type AssetType = '2d' | '2.5d' | '3d' | 'texture'
export type TabId = '2d' | '2.5d' | '3d' | 'texture' | 'settings'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface APIConfig {
  id: number
  name: string
  api_key: string
  base_url: string | null
  model_name: string | null
  provider_hint: string | null
  notes: string | null
  created_at: string | null
}

export interface StorageProfile {
  id: number
  name: string
  type: 'local' | 'remote'
  local_path: string | null
  remote_url: string | null
  remote_token: string | null
  notes: string | null
  created_at: string | null
}

export interface Project {
  id: number
  name: string
  asset_type: AssetType
  created_at: string | null
}

export interface Asset {
  id: number
  project_id: number | null
  asset_type: AssetType
  filename: string
  file_path: string
  thumbnail_path: string | null
  file_size: number | null
  mime_type: string | null
  prompt: string | null
  source_asset_id: number | null
  storage_type: 'local' | 'remote'
  created_at: string | null
  url: string | null
  thumbnail_url: string | null
}

export interface GenerationJob {
  id: number
  job_type: AssetType
  status: JobStatus
  result_asset_id: number | null
  preview_url: string | null
  error_message: string | null
  created_at: string | null
}

// A single entry in the generation conversation thread
export interface ThreadEntry {
  localId: string
  prompt: string
  status: JobStatus
  job: GenerationJob | null
  previewUrl: string | null
  sourceAssetId?: number
  savedAssetId?: number
}
