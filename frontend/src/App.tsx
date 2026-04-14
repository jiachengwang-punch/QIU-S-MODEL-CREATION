import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAppStore } from './store/appStore'
import { settingsApi } from './api/settings'
import { Generate2D } from './pages/Generate2D'
import { Generate25D } from './pages/Generate25D'
import { Generate3D } from './pages/Generate3D'
import { GenerateTexture } from './pages/GenerateTexture'
import { Settings } from './pages/Settings'
import { Toaster } from './components/ui/Toast'
import { PikachuLogo } from './components/PikachuLogo'
import type { TabId } from './types'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,  // 5 分钟内不重新请求
      retry: 1,
    },
  },
})

const TABS: { id: TabId; label: string; accent?: boolean }[] = [
  { id: '2d', label: '2D' },
  { id: '2.5d', label: '2.5D' },
  { id: '3d', label: '3D' },
  { id: 'texture', label: '贴图' },
  { id: 'settings', label: '设置' },
]

function TabBar() {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <div className="flex items-stretch h-11 border-b border-border bg-bg-secondary flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center px-5 border-r border-border">
        <span className="text-sm font-bold tracking-tight"
          style={{ background: 'linear-gradient(90deg, #7c5cfc, #00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          QIU'S MODEL CREATION
        </span>
      </div>

      <div className="flex items-stretch flex-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          const isSettings = tab.id === 'settings'
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 text-sm font-medium transition-all flex items-center gap-1.5
                          ${isSettings ? 'ml-auto border-l border-border' : ''}
                          ${active
                            ? 'text-text-primary'
                            : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'}`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 inset-x-3 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #7c5cfc, #00d2ff)' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AppContent() {
  const { activeTab } = useAppStore()

  // 启动时预取，后续切换标签页直接读缓存，无 loading
  useEffect(() => {
    qc.prefetchQuery({ queryKey: ['api-configs'], queryFn: settingsApi.list })
    qc.prefetchQuery({ queryKey: ['active-storage'], queryFn: settingsApi.getActiveStorage })
  }, [])
  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      <TabBar />
      <div className="flex-1 overflow-hidden">
        {activeTab === '2d' && <Generate2D />}
        {activeTab === '2.5d' && <Generate25D />}
        {activeTab === '3d' && <Generate3D />}
        {activeTab === 'texture' && <GenerateTexture />}
        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto">
            <Settings />
          </div>
        )}
      </div>
      <Toaster />
      {/* Pikachu logo — bottom-left */}
      <div className="fixed bottom-4 left-4 opacity-80 hover:opacity-100 transition-opacity pointer-events-none select-none">
        <PikachuLogo size={64} />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AppContent />
    </QueryClientProvider>
  )
}
