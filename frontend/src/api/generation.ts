import { api } from './client'
import type { GenerationJob, AssetType } from '../types'

export const generationApi = {
  generate2d: async (params: {
    prompt: string
    api_config_id: number
    width?: number
    height?: number
    refs?: File[]
  }) => {
    const form = new FormData()
    form.append('prompt', params.prompt)
    form.append('api_config_id', String(params.api_config_id))
    form.append('width', String(params.width ?? 1024))
    form.append('height', String(params.height ?? 1024))
    if (params.refs?.[0]) form.append('ref1', params.refs[0])
    if (params.refs?.[1]) form.append('ref2', params.refs[1])
    if (params.refs?.[2]) form.append('ref3', params.refs[2])
    return api.multipart<GenerationJob>('/generate/2d', form)
  },

  generate25d: async (params: {
    prompt?: string
    api_config_id: number
    source_image?: File
    source_asset_id?: number
  }) => {
    const form = new FormData()
    form.append('prompt', params.prompt ?? '')
    form.append('api_config_id', String(params.api_config_id))
    if (params.source_image) form.append('source_image', params.source_image)
    if (params.source_asset_id != null) form.append('source_asset_id', String(params.source_asset_id))
    return api.multipart<GenerationJob>('/generate/2.5d', form)
  },

  generate3d: async (params: {
    prompt?: string
    api_config_id: number
    source_image?: File
    source_asset_id?: number
  }) => {
    const form = new FormData()
    form.append('prompt', params.prompt ?? '')
    form.append('api_config_id', String(params.api_config_id))
    if (params.source_image) form.append('source_image', params.source_image)
    if (params.source_asset_id != null) form.append('source_asset_id', String(params.source_asset_id))
    return api.multipart<GenerationJob>('/generate/3d', form)
  },

  getJob: (id: number) => api.get<GenerationJob>(`/generate/jobs/${id}`),
}
