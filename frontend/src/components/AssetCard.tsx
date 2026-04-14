import { Download, Trash2, Box } from 'lucide-react'
import type { Asset } from '../types'
import { libraryApi } from '../api/library'
import { toast } from './ui/Toast'

interface AssetCardProps {
  asset: Asset
  onDeleted: () => void
  onSelect?: (asset: Asset) => void
  selected?: boolean
}

export function AssetCard({ asset, onDeleted, onSelect, selected }: AssetCardProps) {
  const isGlb = asset.mime_type === 'model/gltf-binary' || asset.filename.endsWith('.glb')

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`删除 ${asset.filename}？`)) return
    try {
      await libraryApi.delete(asset.id)
      onDeleted()
      toast.success('已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const a = document.createElement('a')
    a.href = libraryApi.downloadUrl(asset.id)
    a.download = asset.filename
    a.click()
  }

  return (
    <div
      className={`group relative rounded-lg overflow-hidden border cursor-pointer transition-all
                  ${selected
                    ? 'border-accent ring-1 ring-accent/40 shadow-glow-sm'
                    : 'border-border hover:border-accent/40'}`}
      onClick={() => onSelect?.(asset)}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-bg-elevated flex items-center justify-center">
        {isGlb ? (
          <div className="flex flex-col items-center gap-1 text-text-muted">
            <Box size={32} />
            <span className="text-xs">GLB</span>
          </div>
        ) : asset.thumbnail_url ? (
          <img
            src={asset.thumbnail_url}
            alt={asset.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-text-muted text-xs">无预览</div>
        )}
      </div>

      {/* Filename */}
      <div className="px-2 py-1.5 bg-bg-card">
        <p className="text-xs text-text-secondary truncate" title={asset.filename}>
          {asset.filename}
        </p>
      </div>

      {/* Actions overlay */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDownload}
          className="p-1.5 rounded bg-black/70 text-text-secondary hover:text-white transition-colors"
          title="下载"
        >
          <Download size={13} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded bg-black/70 text-red-400 hover:text-red-300 transition-colors"
          title="删除"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  )
}
