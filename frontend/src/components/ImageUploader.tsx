import { useRef, useState } from 'react'
import { Upload, X, ImagePlus } from 'lucide-react'

interface ImageUploaderProps {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
  label?: string
}

export function ImageUploader({ files, onChange, maxFiles = 3, label = '参考图片' }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const arr = Array.from(newFiles).filter((f) => f.type.startsWith('image/'))
    const combined = [...files, ...arr].slice(0, maxFiles)
    onChange(combined)
  }

  const remove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <label className="label">{label} (最多 {maxFiles} 张)</label>
      <div className="flex gap-2 flex-wrap">
        {files.map((f, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
            <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => remove(i)}
              className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5
                         opacity-0 group-hover:opacity-100 transition-opacity text-white"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {files.length < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1
                        text-text-muted hover:text-text-secondary hover:border-accent/50 transition-colors text-xs
                        ${dragging ? 'border-accent bg-accent/10 text-accent' : 'border-border'}`}
          >
            <ImagePlus size={18} />
            <span>添加</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
    </div>
  )
}
