import { useRef, useEffect, useState } from 'react'
import { Save, AlertCircle, ChevronRight, ChevronDown, FolderPlus, Check, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Spinner } from './ui/Spinner'
import { projectsApi } from '../api/projects'
import { toast } from './ui/Toast'
import type { ThreadEntry, AssetType, Project } from '../types'

interface Props {
  entries: ThreadEntry[]
  assetType: AssetType
  onSave: (entry: ThreadEntry, projectId: number | null) => void
  renderPreview?: (url: string, entry: ThreadEntry) => React.ReactNode
}

export function GenerationThread({ entries, assetType, onSave, renderPreview }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length, entries[entries.length - 1]?.status])

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted">
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center">
          <ChevronRight size={22} className="opacity-30" />
        </div>
        <p className="text-sm">在左侧输入描述并点击生成</p>
        <p className="text-xs opacity-50">Ctrl+Enter 快速生成</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
      {entries.map((entry) => (
        <ThreadCard
          key={entry.localId}
          entry={entry}
          assetType={assetType}
          onSave={onSave}
          renderPreview={renderPreview}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

function ThreadCard({ entry, assetType, onSave, renderPreview }: {
  entry: ThreadEntry
  assetType: AssetType
  onSave: (e: ThreadEntry, projectId: number | null) => void
  renderPreview?: (url: string, entry: ThreadEntry) => React.ReactNode
}) {
  const isLoading = entry.status === 'pending' || entry.status === 'processing'
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      {/* Prompt bubble */}
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-accent/15 border border-accent/25 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
            {entry.prompt || '（无描述）'}
          </p>
        </div>
      </div>

      {/* Result card */}
      <div className="flex justify-start">
        <div className="w-full max-w-[420px]">
          <div className="bg-bg-card border border-border rounded-2xl rounded-tl-sm overflow-hidden">
            {isLoading && (
              <div className="flex items-center gap-3 px-5 py-8">
                <Spinner size={20} />
                <div>
                  <p className="text-sm text-text-secondary">
                    {entry.status === 'pending' ? '排队中…' : '生成中…'}
                  </p>
                  {entry.job?.job_type === '3d' && (
                    <p className="text-xs text-text-muted mt-0.5">3D 生成通常需要 1-3 分钟</p>
                  )}
                </div>
              </div>
            )}

            {entry.status === 'failed' && (
              <div className="flex items-start gap-3 px-4 py-4 text-red-400">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span className="text-sm">{entry.job?.error_message || '生成失败，请重试'}</span>
              </div>
            )}

            {entry.status === 'done' && entry.previewUrl && (
              <>
                <div className="aspect-square w-full">
                  {renderPreview
                    ? renderPreview(entry.previewUrl, entry)
                    : <img src={entry.previewUrl} alt="result"
                        className="w-full h-full object-contain bg-[#0d0d14]" />
                  }
                </div>

                <div className="px-3 py-2.5 border-t border-border bg-bg-secondary flex items-center justify-between gap-2">
                  {entry.savedAssetId ? (
                    <span className="text-xs text-green-400 flex items-center gap-1.5">
                      <Check size={13} /> 已保存到素材库
                    </span>
                  ) : (
                    <SaveButton
                      entry={entry}
                      assetType={assetType}
                      onSave={onSave}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SaveButton({ entry, assetType, onSave }: {
  entry: ThreadEntry
  assetType: AssetType
  onSave: (e: ThreadEntry, projectId: number | null) => void
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', assetType],
    queryFn: () => projectsApi.list(assetType),
  })

  const createMut = useMutation({
    mutationFn: () => projectsApi.create(newName.trim(), assetType),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['projects', assetType] })
      setCreating(false)
      setNewName('')
      onSave(entry, p.id)
      setOpen(false)
    },
    onError: () => toast.error('创建失败'),
  })

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-primary text-xs py-1.5 gap-1.5"
      >
        <Save size={13} />
        保存到素材库
        <ChevronDown size={11} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setCreating(false) }} />
          <div className="absolute bottom-full mb-2 left-0 min-w-[180px] bg-bg-elevated border border-border
                          rounded-xl shadow-card z-20 py-1.5 overflow-hidden">
            <p className="px-3 py-1 text-xs text-text-muted">保存到项目文件夹</p>

            <button
              onClick={() => { onSave(entry, null); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-bg-card transition-colors"
            >
              不分类（根目录）
            </button>

            {projects.length > 0 && (
              <>
                <div className="mx-3 my-1 border-t border-border" />
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onSave(entry, p.id); setOpen(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-bg-card transition-colors truncate"
                  >
                    {p.name}
                  </button>
                ))}
              </>
            )}

            <div className="mx-3 my-1 border-t border-border" />

            {creating ? (
              <div className="flex items-center gap-1 px-2 py-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newName.trim()) createMut.mutate()
                    if (e.key === 'Escape') setCreating(false)
                  }}
                  placeholder="项目名称"
                  className="flex-1 bg-bg-primary border border-accent/50 rounded px-2 py-0.5 text-xs
                             text-text-primary focus:outline-none min-w-0"
                />
                <button onClick={() => newName.trim() && createMut.mutate()}
                  className="text-green-400 hover:text-green-300"><Check size={12} /></button>
                <button onClick={() => setCreating(false)}
                  className="text-text-muted hover:text-red-400"><X size={12} /></button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left px-3 py-2 text-xs text-text-muted hover:text-accent
                           hover:bg-bg-card transition-colors flex items-center gap-1.5"
              >
                <FolderPlus size={11} /> 新建项目文件夹
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
