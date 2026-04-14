import { useState, useCallback } from 'react'
import { Wand2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api/settings'
import { generationApi } from '../api/generation'
import { libraryApi } from '../api/library'
import { ImageUploader } from '../components/ImageUploader'
import { AssetLibrary } from '../components/AssetLibrary'
import { GenerationThread } from '../components/GenerationThread'
import { DraggablePreview } from '../components/DraggablePreview'
import { Spinner } from '../components/ui/Spinner'
import { toast } from '../components/ui/Toast'
import type { ThreadEntry } from '../types'

let _id = 0
const newId = () => String(++_id)

export function Generate2D() {
  const qc = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [refs, setRefs] = useState<File[]>([])
  const [selectedApi, setSelectedApi] = useState<number | ''>('')
  const [generating, setGenerating] = useState(false)
  const [entries, setEntries] = useState<ThreadEntry[]>([])

  const { data: apis = [] } = useQuery({ queryKey: ['api-configs'], queryFn: settingsApi.list })

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('请输入描述'); return }
    if (!selectedApi) { toast.error('请选择 API 配置'); return }

    const localId = newId()
    setEntries(e => [...e, { localId, prompt, status: 'processing', job: null, previewUrl: null }])
    setGenerating(true)
    try {
      const job = await generationApi.generate2d({ prompt, api_config_id: Number(selectedApi), refs })
      setEntries(e => e.map(x => x.localId === localId
        ? { ...x, status: job.status, job, previewUrl: job.preview_url } : x))
      if (job.status === 'failed') toast.error(job.error_message || '生成失败')
    } catch (err: any) {
      setEntries(e => e.map(x => x.localId === localId ? { ...x, status: 'failed' } : x))
      toast.error(err.message || '生成失败')
    } finally { setGenerating(false) }
  }

  const handleSave = useCallback(async (entry: ThreadEntry, projectId: number | null) => {
    if (!entry.job) return
    try {
      await libraryApi.save(entry.job.id, projectId)
      qc.invalidateQueries({ queryKey: ['assets', '2d'] })
      setEntries(e => e.map(x => x.localId === entry.localId ? { ...x, savedAssetId: entry.job!.id } : x))
      toast.success('已保存')
    } catch (err: any) { toast.error(err.message || '保存失败') }
  }, [qc])

  return (
    <div className="flex h-full">
      {/* Left: controls */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4 p-4 border-r border-border overflow-y-auto bg-bg-secondary">
        <div>
          <label className="label">描述</label>
          <textarea
            className="textarea h-28 text-sm"
            placeholder="描述想要的素材，例如：像素风火焰精灵，橙红色调，透明背景…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleGenerate() }}
          />
          <p className="text-xs text-text-muted mt-1">Ctrl+Enter 快速生成</p>
        </div>

        <ImageUploader files={refs} onChange={setRefs} maxFiles={3} />

        <div>
          <label className="label">API 配置</label>
          <select
            className="select text-sm"
            value={selectedApi}
            onChange={(e) => setSelectedApi(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">请选择…</option>
            {apis.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {apis.length === 0 && (
            <p className="text-xs text-text-muted mt-1">请先在「设置」中添加 API 配置</p>
          )}
        </div>

        <button
          className="btn-primary w-full"
          onClick={handleGenerate}
          disabled={generating || !prompt.trim() || !selectedApi}
        >
          {generating ? <><Spinner size={15} /> 生成中…</> : <><Wand2 size={15} /> 生成</>}
        </button>
      </div>

      {/* Center: conversation thread */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-border bg-bg-primary">
        <div className="px-4 py-2 border-b border-border bg-bg-secondary flex-shrink-0">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">生成记录</span>
        </div>
        <GenerationThread
          entries={entries}
          assetType="2d"
          onSave={handleSave}
          renderPreview={(url) => <DraggablePreview src={url} className="w-full h-full" />}
        />
      </div>

      {/* Right: library */}
      <div className="w-80 flex-shrink-0">
        <AssetLibrary assetType="2d" />
      </div>
    </div>
  )
}
