import { useRef, useState } from 'react'
import { Upload, FolderPlus, Check, X, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { libraryApi } from '../api/library'
import { projectsApi } from '../api/projects'
import { AssetCard } from './AssetCard'
import { useAppStore } from '../store/appStore'
import type { AssetType, Asset, Project } from '../types'
import { toast } from './ui/Toast'

interface Props {
  assetType: AssetType
  onSelect?: (asset: Asset) => void
  selectedId?: number | null
}

export function AssetLibrary({ assetType, onSelect, selectedId }: Props) {
  const qc = useQueryClient()
  const { activeProject, setActiveProject } = useAppStore()
  const projectId = activeProject[assetType]
  const uploadRef = useRef<HTMLInputElement>(null)
  const [creatingProject, setCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [showProjectMenu, setShowProjectMenu] = useState(false)

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', assetType, projectId],
    queryFn: () => libraryApi.list(assetType, projectId),
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', assetType],
    queryFn: () => projectsApi.list(assetType),
  })

  const createProjectMut = useMutation({
    mutationFn: () => projectsApi.create(newProjectName.trim(), assetType),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['projects', assetType] })
      setActiveProject(assetType, p.id)
      setCreatingProject(false)
      setNewProjectName('')
      toast.success('项目已创建')
    },
    onError: () => toast.error('创建失败'),
  })

  const deleteProjectMut = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['projects', assetType] })
      qc.invalidateQueries({ queryKey: ['assets', assetType] })
      if (projectId === id) setActiveProject(assetType, null)
      toast.success('项目已删除')
    },
    onError: () => toast.error('删除失败'),
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await libraryApi.upload(assetType, file, projectId)
      qc.invalidateQueries({ queryKey: ['assets', assetType] })
      toast.success('上传成功')
    } catch { toast.error('上传失败') }
    e.target.value = ''
  }

  const activeProjectName = projects.find(p => p.id === projectId)?.name

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-secondary flex-shrink-0">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex-shrink-0">
          素材库
          {assets.length > 0 && <span className="ml-1 normal-case font-normal">({assets.length})</span>}
        </span>

        {/* Project filter dropdown */}
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="w-full flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-bg-elevated
                       text-xs text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
          >
            <span className="truncate flex-1 text-left">{activeProjectName ?? '全部'}</span>
            <ChevronDown size={12} className="flex-shrink-0" />
          </button>

          {showProjectMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProjectMenu(false)} />
              <div className="absolute top-full mt-1 left-0 right-0 bg-bg-elevated border border-border rounded-lg
                              shadow-card z-20 py-1 min-w-[160px]">
                <button
                  onClick={() => { setActiveProject(assetType, null); setShowProjectMenu(false) }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors
                              ${projectId === null ? 'text-accent bg-accent/10' : 'text-text-secondary hover:bg-bg-card'}`}
                >
                  {projectId === null && <Check size={11} />}
                  <span className={projectId === null ? '' : 'ml-[15px]'}>全部</span>
                </button>

                {projects.length > 0 && (
                  <>
                    <div className="mx-3 my-1 border-t border-border" />
                    {projects.map(p => (
                      <ProjectMenuItem
                        key={p.id}
                        project={p}
                        active={projectId === p.id}
                        onSelect={() => { setActiveProject(assetType, p.id); setShowProjectMenu(false) }}
                        onDelete={() => {
                          if (confirm(`删除项目「${p.name}」及其所有素材？`))
                            deleteProjectMut.mutate(p.id)
                          setShowProjectMenu(false)
                        }}
                        assetType={assetType}
                        qc={qc}
                      />
                    ))}
                  </>
                )}

                <div className="mx-3 my-1 border-t border-border" />
                {creatingProject ? (
                  <div className="flex items-center gap-1 px-2 py-1">
                    <input
                      autoFocus
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newProjectName.trim()) createProjectMut.mutate()
                        if (e.key === 'Escape') { setCreatingProject(false); setNewProjectName('') }
                      }}
                      placeholder="项目名称"
                      className="flex-1 bg-bg-primary border border-accent/50 rounded px-2 py-0.5 text-xs
                                 text-text-primary focus:outline-none min-w-0"
                    />
                    <button onClick={() => newProjectName.trim() && createProjectMut.mutate()}
                      className="text-green-400 hover:text-green-300 flex-shrink-0"><Check size={12} /></button>
                    <button onClick={() => { setCreatingProject(false); setNewProjectName('') }}
                      className="text-text-muted hover:text-red-400 flex-shrink-0"><X size={12} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreatingProject(true)}
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

        <button onClick={() => uploadRef.current?.click()}
          className="flex-shrink-0 p-1.5 text-text-muted hover:text-accent transition-colors rounded hover:bg-bg-elevated"
          title="上传素材">
          <Upload size={14} />
        </button>
        <input ref={uploadRef} type="file" className="hidden" accept="image/*,.glb,.gltf" onChange={handleUpload} />
      </div>

      {/* Asset grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-text-muted text-xs">加载中…</div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-text-muted">
            <Upload size={22} className="opacity-20" />
            <p className="text-xs">{projectId ? '此项目暂无素材' : '暂无素材'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selectedId === asset.id}
                onSelect={onSelect}
                onDeleted={() => qc.invalidateQueries({ queryKey: ['assets', assetType] })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectMenuItem({ project, active, onSelect, onDelete, assetType, qc }: {
  project: Project
  active: boolean
  onSelect: () => void
  onDelete: () => void
  assetType: AssetType
  qc: ReturnType<typeof useQueryClient>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)

  const renameMut = useMutation({
    mutationFn: () => projectsApi.rename(project.id, name.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects', assetType] }); setEditing(false) },
    onError: () => toast.error('重命名失败'),
  })

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) renameMut.mutate(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 bg-bg-primary border border-accent/50 rounded px-2 py-0.5 text-xs text-text-primary focus:outline-none min-w-0" />
        <button onClick={() => name.trim() && renameMut.mutate()} className="text-green-400 hover:text-green-300"><Check size={12} /></button>
        <button onClick={() => setEditing(false)} className="text-text-muted hover:text-red-400"><X size={12} /></button>
      </div>
    )
  }

  return (
    <div className={`group flex items-center px-3 py-2 cursor-pointer transition-colors
                    ${active ? 'text-accent bg-accent/10' : 'text-text-secondary hover:bg-bg-card'}`}
      onClick={onSelect}>
      {active ? <Check size={11} className="flex-shrink-0 mr-2" /> : <span className="w-[15px] flex-shrink-0" />}
      <span className="flex-1 text-xs truncate">{project.name}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
        <button onClick={(e) => { e.stopPropagation(); setEditing(true) }} className="hover:text-accent p-0.5"><Pencil size={11} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="hover:text-red-400 p-0.5"><Trash2 size={11} /></button>
      </div>
    </div>
  )
}
