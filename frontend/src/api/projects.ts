import { api } from './client'
import type { Project, AssetType } from '../types'

export const projectsApi = {
  list: (type: AssetType) => api.get<Project[]>(`/projects?type=${type}`),
  create: (name: string, asset_type: AssetType) =>
    api.post<Project>('/projects', { name, asset_type }),
  rename: (id: number, name: string) =>
    api.patch<Project>(`/projects/${id}`, { name }),
  delete: (id: number) => api.delete(`/projects/${id}`),
}
