import { create } from 'zustand'
import type { ThemeDefinition } from '@shared/types'

interface ThemeState {
  themes: ThemeDefinition[]
  activeThemeId: string
  activeTheme: ThemeDefinition | null
  load: () => Promise<void>
  setTheme: (id: string) => Promise<void>
}

function applyTheme(theme: ThemeDefinition): void {
  const root = document.documentElement
  const c = theme.colors
  root.style.setProperty('--color-bg', c.bg)
  root.style.setProperty('--color-bg-alt', c.bgAlt)
  root.style.setProperty('--color-surface', c.surface)
  root.style.setProperty('--color-border', c.border)
  root.style.setProperty('--color-text', c.text)
  root.style.setProperty('--color-text-muted', c.textMuted)
  root.style.setProperty('--color-accent', c.accent)
  root.style.setProperty('--color-accent-hover', c.accentHover)
  if (theme.isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themes: [],
  activeThemeId: 'quickssh-dark',
  activeTheme: null,
  load: async () => {
    const themes = await window.quickssh.theme.list()
    const saved = localStorage.getItem('quickssh-theme') || 'quickssh-dark'
    const active = themes.find((t) => t.id === saved) ?? themes[0]
    applyTheme(active)
    set({ themes, activeThemeId: active.id, activeTheme: active })
  },
  setTheme: async (id) => {
    const theme = await window.quickssh.theme.get(id)
    localStorage.setItem('quickssh-theme', id)
    applyTheme(theme)
    set({ activeThemeId: id, activeTheme: theme })
  }
}))
