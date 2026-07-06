import { create } from 'zustand'
import type { TabDescriptor, TabKind } from '@shared/types'

interface TabsState {
  tabs: TabDescriptor[]
  activeId: string | null
  closedMounted: Set<string> // keep-mounted: 即使非活跃也保留在 DOM
  addTab: (kind: TabKind, title: string, extra?: Partial<TabDescriptor>) => string
  closeTab: (id: string) => void
  setActive: (id: string) => void
  renameTab: (id: string, title: string) => void
}

let seq = 0

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeId: null,
  closedMounted: new Set(),

  addTab: (kind, title, extra) => {
    seq += 1
    const id = `tab-${Date.now()}-${seq}`
    const tab: TabDescriptor = { id, kind, title, ...extra }
    set((s) => ({ tabs: [...s.tabs, tab], activeId: id }))
    return id
  },

  closeTab: (id) => {
    const { tabs, activeId, closedMounted } = get()
    const idx = tabs.findIndex((t) => t.id === id)
    const newTabs = tabs.filter((t) => t.id !== id)
    let newActive = activeId
    if (activeId === id) {
      newActive = newTabs[idx] ? newTabs[idx].id : newTabs[idx - 1]?.id ?? null
    }
    const newMounted = new Set(closedMounted)
    newMounted.delete(id)
    set({ tabs: newTabs, activeId: newActive, closedMounted: newMounted })
  },

  setActive: (id) => set({ activeId: id }),

  renameTab: (id, title) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)) }))
}))
