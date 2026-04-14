import { api } from './client'
import type { Asset, AssetType } from '../types'

export const libraryApi = {
  list: (type: AssetType, projectId?: number | null) => {
    const qs = projectId != null ? `?type=${type}&project_id=${projectId}` : `?type=${type}`
    return api.get<Asset[]>(`/library/assets${qs}`)
  },
  save: (jobId: number, projectId?: number | null, filename?: string) =>
    api.post<Asset>('/library/save', { job_id: jobId, project_id: projectId, filename }),
  upload: async (type: AssetType, file: File, projectId?: number | null) => {
    const form = new FormData()
    form.append('type', type)
    form.append('file', file)
    if (projectId != null) form.append('project_id', String(projectId))
    return api.multipart<Asset>('/library/upload', form)
  },
  delete: (id: number) => api.delete(`/library/assets/${id}`),
  downloadUrl: (id: number) => `/api/library/assets/${id}/download`,
}
