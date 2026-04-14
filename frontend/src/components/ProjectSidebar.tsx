import { useState } from 'react'
import { FolderOpen, FolderPlus, Pencil, Trash2, Check, X, Folder } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '../api/projects'
import type { AssetType, Project } from '../types'
import { toast } from './ui/Toast'

interface Props {
  assetType: AssetType
  selected: number | null
  onSelect: (id: number | null) => void
}

export function ProjectSidebar({ assetType, selected, onSelect }: Props) {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

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
      onSelect(p.id)
      toast.success('项目已创建')
    },
    onError: () => toast.error('创建失败'),
  })

  const renameMut = useMutation({
    mutationFn: (id: number) => projectsApi.rename(id, editName.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', assetType] })
      setEditingId(null)
      toast.success('已重命名')
    },
    onError: () => toast.error('重命名失败'),
  })

  const deleteMut = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['projects', assetType] })
      qc.invalidateQueries({ queryKey: ['assets', assetType] })
      if (selected === id) onSelect(null)
      toast.success('项目已删除')
    },
    onError: () => toast.error('删除失败'),
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">项目</span>
        <button
          onClick={() => setCreating(true)}
          className="text-text-muted hover:text-accent transition-colors"
          title="新建项目"
        >
          <FolderPlus size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {/* All */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                      ${selected === null
                        ? 'bg-accent/15 text-accent'
                        : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
        >
          <Folder size={14} />
          <span>全部</span>
        </button>

        {projects.map((p) => (
          <ProjectItem
            key={p.id}
            project={p}
            selected={selected === p.id}
            editing={editingId === p.id}
            editName={editName}
            onSelect={() => onSelect(p.id)}
            onEdit={() => { setEditingId(p.id); setEditName(p.name) }}
            onEditName={setEditName}
            onEditConfirm={() => renameMut.mutate(p.id)}
            onEditCancel={() => setEditingId(null)}
            onDelete={() => {
              if (confirm(`删除项目「${p.name}」及其所有素材？`))
                deleteMut.mutate(p.id)
            }}
          />
        ))}

        {creating && (
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <Folder size={14} className="text-text-muted flex-shrink-0" />
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) createMut.mutate()
                if (e.key === 'Escape') { setCreating(false); setNewName('') }
              }}
              className="flex-1 bg-bg-elevated border border-accent/50 rounded px-2 py-0.5
                         text-xs text-text-primary focus:outline-none"
              placeholder="项目名称"
            />
            <button onClick={() => newName.trim() && createMut.mutate()} className="text-green-400 hover:text-green-300">
              <Check size={13} />
            </button>
            <button onClick={() => { setCreating(false); setNewName('') }} className="text-text-muted hover:text-red-400">
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectItem({ project, selected, editing, editName, onSelect, onEdit, onEditName, onEditConfirm, onEditCancel, onDelete }: {
  project: Project
  selected: boolean
  editing: boolean
  editName: string
  onSelect: () => void
  onEdit: () => void
  onEditName: (v: string) => void
  onEditConfirm: () => void
  onEditCancel: () => void
  onDelete: () => void
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <FolderOpen size={14} className="text-accent flex-shrink-0" />
        <input
          autoFocus
          value={editName}
          onChange={(e) => onEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && editName.trim()) onEditConfirm()
            if (e.key === 'Escape') onEditCancel()
          }}
          className="flex-1 bg-bg-elevated border border-accent/50 rounded px-2 py-0.5
                     text-xs text-text-primary focus:outline-none"
        />
        <button onClick={onEditConfirm} className="text-green-400 hover:text-green-300"><Check size={13} /></button>
        <button onClick={onEditCancel} className="text-text-muted hover:text-red-400"><X size={13} /></button>
      </div>
    )
  }

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
                  ${selected ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
      onClick={onSelect}
    >
      {selected ? <FolderOpen size={14} /> : <Folder size={14} />}
      <span className="flex-1 text-sm truncate">{project.name}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="hover:text-accent">
          <Pencil size={12} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="hover:text-red-400">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}
