import { create } from 'zustand'
import type { TabId, AssetType } from '../types'

interface AppStore {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void

  activeProject: Record<AssetType, number | null>
  setActiveProject: (type: AssetType, id: number | null) => void
}

export const useAppStore = create<AppStore>((set) => ({
  activeTab: '2d',
  setActiveTab: (tab) => set({ activeTab: tab }),

  activeProject: { '2d': null, '2.5d': null, '3d': null, 'texture': null },
  setActiveProject: (type, id) =>
    set((s) => ({ activeProject: { ...s.activeProject, [type]: id } })),
}))
