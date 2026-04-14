import { create } from 'zustand'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastStore {
  toasts: Toast[]
  push: (type: ToastType, message: string) => void
  remove: (id: number) => void
}

let nextId = 1
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (type, message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().push('success', msg),
  error: (msg: string) => useToastStore.getState().push('error', msg),
  info: (msg: string) => useToastStore.getState().push('info', msg),
}

const icons = { success: CheckCircle, error: AlertCircle, info: Info }
const colors = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  info: 'border-accent/30 bg-accent/10 text-accent-hover',
}

export function Toaster() {
  const { toasts, remove } = useToastStore()
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm
                        shadow-card pointer-events-auto animate-in ${colors[t.type]}`}
          >
            <Icon size={16} />
            <span className="text-text-primary">{t.message}</span>
            <button onClick={() => remove(t.id)} className="ml-2 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
