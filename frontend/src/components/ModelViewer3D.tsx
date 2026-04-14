// Type declaration for model-viewer web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string
          alt?: string
          'camera-controls'?: boolean | string
          'auto-rotate'?: boolean | string
          'shadow-intensity'?: string
          exposure?: string
          'environment-image'?: string
          poster?: string
          style?: React.CSSProperties
        },
        HTMLElement
      >
    }
  }
}

interface Props {
  src: string
  className?: string
}

export function ModelViewer3D({ src, className = '' }: Props) {
  return (
    <div className={`relative bg-[#0d0d14] ${className}`}>
      {/* Checkerboard background */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'repeating-conic-gradient(#1a1a25 0% 25%, #111118 0% 50%)',
        backgroundSize: '20px 20px',
        opacity: 0.4,
      }} />
      <model-viewer
        src={src}
        alt="3D model"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      />
      <div className="absolute bottom-2 left-2 text-xs text-text-muted bg-black/50 px-2 py-1 rounded pointer-events-none">
        拖拽旋转 · 滚轮缩放
      </div>
    </div>
  )
}
