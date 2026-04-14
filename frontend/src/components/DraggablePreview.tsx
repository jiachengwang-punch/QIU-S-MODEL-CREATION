import { useState, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface DraggablePreviewProps {
  src: string
  className?: string
}

export function DraggablePreview({ src, className = '' }: DraggablePreviewProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    lastPos.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }, [pos])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    setPos({ x: e.clientX - lastPos.current.x, y: e.clientY - lastPos.current.y })
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = false }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.max(0.3, Math.min(6, s * (e.deltaY > 0 ? 0.9 : 1.1))))
  }, [])

  const reset = () => { setPos({ x: 0, y: 0 }); setScale(1) }

  return (
    <div
      className={`relative overflow-hidden select-none bg-[#0d0d14] ${className}`}
      style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      {/* Checkerboard pattern for transparency */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'repeating-conic-gradient(#1a1a25 0% 25%, #111118 0% 50%)',
        backgroundSize: '20px 20px',
        opacity: 0.5,
      }} />

      <img
        src={src}
        alt="preview"
        draggable={false}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
          transformOrigin: 'center',
          maxWidth: '90%',
          maxHeight: '90%',
          objectFit: 'contain',
          imageRendering: 'pixelated',
        }}
      />

      {/* Controls */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(6, s * 1.2)) }}
          className="w-7 h-7 rounded bg-black/60 text-text-secondary hover:text-white flex items-center justify-center">
          <ZoomIn size={13} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.3, s * 0.8)) }}
          className="w-7 h-7 rounded bg-black/60 text-text-secondary hover:text-white flex items-center justify-center">
          <ZoomOut size={13} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); reset() }}
          className="w-7 h-7 rounded bg-black/60 text-text-secondary hover:text-white flex items-center justify-center">
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-2 left-2 text-xs text-text-muted bg-black/50 px-1.5 py-0.5 rounded">
        {Math.round(scale * 100)}%
      </div>
    </div>
  )
}
