import { useState, useCallback } from 'react'
import { Layers } from 'lucide-react'
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

const PRESETS = [
  { label: '自定义', value: '' },
  { label: '无缝纹理', value: ', seamless tileable texture, 4K, game ready' },
  { label: '法线贴图', value: ', normal map, blue-purple tones, tileable' },
  { label: 'PBR 粗糙度', value: ', roughness map, grayscale, tileable' },
  { label: '金属度贴图', value: ', metalness map, grayscale, tileable' },
  { label: 'AO 贴图', value: ', ambient occlusion map, grayscale' },
]

export function GenerateTexture() {
  const qc = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [refs, setRefs] = useState<File[]>([])
  const [selectedApi, setSelectedApi] = useState<number | ''>('')
  const [generating, setGenerating] = useState(false)
  const [entries, setEntries] = useState<ThreadEntry[]>([])
  const [preset, setPreset] = useState('')
  const [resolution, setResolution] = useState<'512' | '1024' | '2048'>('1024')

  const { data: apis = [] } = useQuery({ queryKey: ['api-configs'], queryFn: settingsApi.list })

  const fullPrompt = prompt + preset

  const handleGenerate = async () => {
    if (!fullPrompt.trim()) { toast.error('请输入描述'); return }
    if (!selectedApi) { toast.error('请选择 API 配置'); return }

    const localId = newId()
    const display = fullPrompt.slice(0, 80) + (fullPrompt.length > 80 ? '…' : '')
    setEntries(e => [...e, { localId, prompt: display, status: 'processing', job: null, previewUrl: null }])
    setGenerating(true)
    try {
      const size = Number(resolution)
      const job = await generationApi.generate2d({ prompt: fullPrompt, api_config_id: Number(selectedApi), refs, width: size, height: size })
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
      qc.invalidateQueries({ queryKey: ['assets', 'texture'] })
      setEntries(e => e.map(x => x.localId === entry.localId ? { ...x, savedAssetId: entry.job!.id } : x))
      toast.success('已保存到贴图素材库')
    } catch (err: any) { toast.error(err.message || '保存失败') }
  }, [qc])

  return (
    <div className="flex h-full">
      <div className="w-64 flex-shrink-0 flex flex-col gap-4 p-4 border-r border-border overflow-y-auto bg-bg-secondary">
        <div>
          <label className="label">描述</label>
          <textarea className="textarea h-24 text-sm"
            placeholder="描述贴图内容，例如：砖墙，旧石纹，生锈金属…"
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleGenerate() }} />
          <p className="text-xs text-text-muted mt-1">Ctrl+Enter 快速生成</p>
        </div>

        <div>
          <label className="label">贴图类型</label>
          <div className="flex flex-col gap-1">
            {PRESETS.map(p => (
              <button key={p.value}
                onClick={() => setPreset(p.value)}
                className={`text-left px-3 py-1.5 rounded text-xs border transition-colors
                            ${preset === p.value ? 'bg-accent/20 border-accent/40 text-accent' : 'border-border text-text-secondary hover:border-accent/30'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">分辨率</label>
          <div className="flex gap-1.5">
            {(['512', '1024', '2048'] as const).map(r => (
              <button key={r} onClick={() => setResolution(r)}
                className={`flex-1 btn text-xs py-1 ${resolution === r ? 'btn-primary' : 'btn-ghost'}`}>{r}</button>
            ))}
          </div>
        </div>

        <ImageUploader files={refs} onChange={setRefs} maxFiles={3} label="参考图片" />

        <div>
          <label className="label">API 配置</label>
          <select className="select text-sm" value={selectedApi}
            onChange={(e) => setSelectedApi(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">请选择…</option>
            {apis.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {apis.length === 0 && <p className="text-xs text-text-muted mt-1">请先在「设置」中添加 API 配置</p>}
        </div>

        <button className="btn-primary w-full" onClick={handleGenerate}
          disabled={generating || !fullPrompt.trim() || !selectedApi}>
          {generating ? <><Spinner size={15} /> 生成中…</> : <><Layers size={15} /> 生成贴图</>}
        </button>
      </div>

      <div className="flex-1 min-w-0 flex flex-col border-r border-border bg-bg-primary">
        <div className="px-4 py-2 border-b border-border bg-bg-secondary flex-shrink-0">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">生成记录</span>
        </div>
        <GenerationThread entries={entries} assetType={'texture' as any} onSave={handleSave}
          renderPreview={(url) => <DraggablePreview src={url} className="w-full h-full" />} />
      </div>

      <div className="w-80 flex-shrink-0">
        <AssetLibrary assetType={'texture' as any} />
      </div>
    </div>
  )
}
