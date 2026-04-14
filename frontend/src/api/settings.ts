import { api } from './client'
import type { APIConfig, StorageProfile } from '../types'

export const settingsApi = {
  // API Configs
  list: () => api.get<APIConfig[]>('/settings/api-configs'),
  create: (data: Omit<APIConfig, 'id' | 'created_at'>) =>
    api.post<APIConfig>('/settings/api-configs', data),
  update: (id: number, data: Omit<APIConfig, 'id' | 'created_at'>) =>
    api.put<APIConfig>(`/settings/api-configs/${id}`, data),
  delete: (id: number) => api.delete(`/settings/api-configs/${id}`),

  // Storage Profiles
  listStorage: () => api.get<StorageProfile[]>('/settings/storage-profiles'),
  createStorage: (data: Omit<StorageProfile, 'id' | 'created_at'>) =>
    api.post<StorageProfile>('/settings/storage-profiles', data),
  updateStorage: (id: number, data: Omit<StorageProfile, 'id' | 'created_at'>) =>
    api.put<StorageProfile>(`/settings/storage-profiles/${id}`, data),
  deleteStorage: (id: number) => api.delete(`/settings/storage-profiles/${id}`),
  getActiveStorage: () => api.get<StorageProfile | null>('/settings/active-storage'),
  setActiveStorage: (id: number) => api.put(`/settings/active-storage/${id}`, {}),
}
