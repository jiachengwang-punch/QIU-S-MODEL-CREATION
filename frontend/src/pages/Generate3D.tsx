import { useState, useCallback, useEffect, useRef } from 'react'
import { Box, Library, Upload } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api/settings'
import { generationApi } from '../api/generation'
import { libraryApi } from '../api/library'
import { AssetLibrary } from '../components/AssetLibrary'
import { GenerationThread } from '../components/GenerationThread'
import { ModelViewer3D } from '../components/ModelViewer3D'
import { Spinner } from '../components/ui/Spinner'
import { toast } from '../components/ui/Toast'
import type { Asset, ThreadEntry } from '../types'

let _id = 0
const newId = () => String(++_id)

export function Generate3D() {
  const qc = useQueryClient()
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  const [sourceMode, setSourceMode] = useState<'library' | 'upload'>('library')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [prompt, setPrompt] = useState('')
  const [selectedApi, setSelectedApi] = useState<number | ''>('')
  const [generating, setGenerating] = useState(false)
  const [entries, setEntries] = useState<ThreadEntry[]>([])
  const [showSourcePicker, setShowSourcePicker] = useState(false)

  const { data: apis = [] } = useQuery({ queryKey: ['api-configs'], queryFn: settingsApi.list })

  useEffect(() => () => { Object.values(pollTimers.current).forEach(clearInterval) }, [])

  const startPolling = (localId: string, jobId: number) => {
    const timer = setInterval(async () => {
      try {
        const updated = await generationApi.getJob(jobId)
        setEntries(e => e.map(x => x.localId === localId
          ? { ...x, status: updated.status, job: updated, previewUrl: updated.preview_url } : x))
        if (updated.status === 'done' || updated.status === 'failed') {
          clearInterval(pollTimers.current[localId])
          delete pollTimers.current[localId]
          setGenerating(false)
          if (updated.status === 'failed') toast.error(updated.error_message || '生成失败')
        }
      } catch { }
    }, 5000)
    pollTimers.current[localId] = timer
  }

  const handleGenerate = async () => {
    if (!selectedApi) { toast.error('请选择 API 配置'); return }
    if (sourceMode === 'library' && !selectedAsset) { toast.error('请选择来源 2D 素材'); return }
    if (sourceMode === 'upload' && !uploadFile) { toast.error('请上传来源图片'); return }

    const localId = newId()
    setEntries(e => [...e, { localId, prompt: prompt || '（以来源素材生成 3D）', status: 'pending', job: null, previewUrl: null }])
    setGenerating(true)
    toast.info('3D 生成已提交，通常需要 1-3 分钟…')
    try {
      const job = await generationApi.generate3d({
        prompt, api_config_id: Number(selectedApi),
        source_image: sourceMode === 'upload' ? uploadFile! : undefined,
        source_asset_id: sourceMode === 'library' ? selectedAsset!.id : undefined,
      })
      setEntries(e => e.map(x => x.localId === localId ? { ...x, job, status: job.status } : x))
      if (job.status === 'pending' || job.status === 'processing') {
        startPolling(localId, job.id)
      } else {
        setGenerating(false)
        setEntries(e => e.map(x => x.localId === localId
          ? { ...x, status: job.status, previewUrl: job.preview_url } : x))
      }
    } catch (err: any) {
      setEntries(e => e.map(x => x.localId === localId ? { ...x, status: 'failed' } : x))
      toast.error(err.message || '生成失败')
      setGenerating(false)
    }
  }

  const handleSave = useCallback(async (entry: ThreadEntry, projectId: number | null) => {
    if (!entry.job) return
    try {
      await libraryApi.save(entry.job.id, projectId)
      qc.invalidateQueries({ queryKey: ['assets', '3d'] })
      setEntries(e => e.map(x => x.localId === entry.localId ? { ...x, savedAssetId: entry.job!.id } : x))
      toast.success('已保存到 3D 素材库')
    } catch (err: any) { toast.error(err.message || '保存失败') }
  }, [qc])

  const render3D = useCallback((url: string) =>
    url.endsWith('.glb')
      ? <ModelViewer3D src={url} className="w-full h-full" />
      : <img src={url} alt="3d" className="w-full h-full object-contain bg-[#0d0d14]" />
  , [])

  return (
    <div className="flex h-full">
      <div className="w-64 flex-shrink-0 flex flex-col gap-4 p-4 border-r border-border overflow-y-auto bg-bg-secondary">
        <div>
          <label className="label">来源图片</label>
          <div className="flex gap-1.5 mb-2">
            <button className={`btn text-xs py-1 flex-1 ${sourceMode === 'library' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSourceMode('library')}><Library size={12} /> 素材库</button>
            <button className={`btn text-xs py-1 flex-1 ${sourceMode === 'upload' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSourceMode('upload')}><Upload size={12} /> 上传</button>
          </div>
          {sourceMode === 'library' ? (
            <button onClick={() => setShowSourcePicker(true)}
              className="w-full border-2 border-dashed border-border rounded-lg p-2 flex flex-col items-center gap-1.5
                         text-text-muted hover:border-accent/50 hover:text-accent transition-colors text-xs">
              {selectedAsset
                ? <><img src={selectedAsset.thumbnail_url || selectedAsset.url || ''} className="w-14 h-14 object-cover rounded" alt="" /><span className="truncate w-full text-center">{selectedAsset.filename}</span></>
                : <><Library size={18} /><span>选择 2D 素材</span></>}
            </button>
          ) : (
            <label className="w-full border-2 border-dashed border-border rounded-lg p-2 flex flex-col items-center gap-1.5
                              text-text-muted hover:border-accent/50 hover:text-accent transition-colors text-xs cursor-pointer">
              {uploadFile
                ? <><img src={URL.createObjectURL(uploadFile)} className="w-14 h-14 object-cover rounded" alt="" /><span className="truncate w-full text-center">{uploadFile.name}</span></>
                : <><Upload size={18} /><span>上传图片</span></>}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            </label>
          )}
        </div>

        <div>
          <label className="label">附加描述（可选）</label>
          <textarea className="textarea h-20 text-sm"
            placeholder="例如：低多边形，PBR 材质…"
            value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>

        <div>
          <label className="label">API 配置</label>
          <select className="select text-sm" value={selectedApi}
            onChange={(e) => setSelectedApi(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">请选择…</option>
            {apis.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {apis.length === 0
            ? <p className="text-xs text-text-muted mt-1">请先在「设置」中添加 API 配置</p>
            : <p className="text-xs text-text-muted mt-1">3D 生成推荐使用 Meshy AI</p>
          }
        </div>

        <button className="btn-primary w-full" onClick={handleGenerate}
          disabled={generating || !selectedApi || (sourceMode === 'library' && !selectedAsset) || (sourceMode === 'upload' && !uploadFile)}>
          {generating ? <><Spinner size={15} /> 生成中…</> : <><Box size={15} /> 生成 3D</>}
        </button>
      </div>

      <div className="flex-1 min-w-0 flex flex-col border-r border-border bg-bg-primary">
        {showSourcePicker ? (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary flex-shrink-0">
              <span className="text-sm font-medium">选择来源素材（2D 库）</span>
              <button className="btn-ghost text-xs py-1" onClick={() => setShowSourcePicker(false)}>完成</button>
            </div>
            <div className="flex-1 min-h-0">
              <AssetLibrary assetType="2d" selectedId={selectedAsset?.id}
                onSelect={(a) => { setSelectedAsset(a); setShowSourcePicker(false) }} />
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-border bg-bg-secondary flex-shrink-0">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">生成记录</span>
            </div>
            <GenerationThread entries={entries} assetType="3d" onSave={handleSave} renderPreview={render3D} />
          </>
        )}
      </div>

      <div className="w-80 flex-shrink-0">
        <AssetLibrary assetType="3d" />
      </div>
    </div>
  )
}
