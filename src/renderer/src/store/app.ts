import { create } from 'zustand'

interface AppState {
  commandPaletteOpen: boolean
  locked: boolean // 暂离保护锁定
  sidebarOpen: boolean
  monitorTabId: string | null
  setCommandPaletteOpen: (open: boolean) => void
  setLocked: (locked: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setMonitorTabId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  commandPaletteOpen: false,
  locked: false,
  sidebarOpen: true,
  monitorTabId: null,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setLocked: (locked) => set({ locked }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMonitorTabId: (id) => set({ monitorTabId: id })
}))
