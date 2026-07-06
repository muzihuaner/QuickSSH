import type { ThemeDefinition } from '@shared/types'

/** 内置 VSCode 风格主题包 */
export const builtInThemes: ThemeDefinition[] = [
  {
    id: 'quickssh-dark',
    name: 'QuickSSH Dark',
    isDark: true,
    colors: {
      bg: '24 24 27',
      bgAlt: '30 30 34',
      surface: '39 39 42',
      border: '63 63 70',
      text: '229 231 235',
      textMuted: '148 163 184',
      accent: '59 130 246',
      accentHover: '37 99 235'
    },
    terminal: {
      background: '#18181b',
      foreground: '#e5e7eb',
      cursor: '#3b82f6',
      selection: 'rgba(59,130,246,0.3)',
      ansi: [
        '#000000', '#ef4444', '#22c55e', '#eab308',
        '#3b82f6', '#a855f7', '#06b6d4', '#a1a1aa',
        '#525252', '#f87171', '#4ade80', '#facc15',
        '#60a5fa', '#c084fc', '#22d3ee', '#ffffff'
      ]
    }
  },
  {
    id: 'quickssh-light',
    name: 'QuickSSH Light',
    isDark: false,
    colors: {
      bg: '255 255 255',
      bgAlt: '248 250 252',
      surface: '241 245 249',
      border: '203 213 225',
      text: '15 23 42',
      textMuted: '100 116 139',
      accent: '59 130 246',
      accentHover: '37 99 235'
    },
    terminal: {
      background: '#ffffff',
      foreground: '#0f172a',
      cursor: '#3b82f6',
      selection: 'rgba(59,130,246,0.2)',
      ansi: [
        '#000000', '#dc2626', '#16a34a', '#ca8a04',
        '#2563eb', '#9333ea', '#0891b2', '#64748b',
        '#475569', '#ef4444', '#22c55e', '#eab308',
        '#3b82f6', '#a855f7', '#06b6d4', '#f8fafc'
      ]
    }
  },
  {
    id: 'quickssh-midnight',
    name: 'Midnight Blue',
    isDark: true,
    colors: {
      bg: '15 23 42',
      bgAlt: '20 30 52',
      surface: '30 41 59',
      border: '51 65 85',
      text: '226 232 240',
      textMuted: '148 163 184',
      accent: '56 189 248',
      accentHover: '38 174 228'
    },
    terminal: {
      background: '#0f172a',
      foreground: '#e2e8f0',
      cursor: '#38bdf8',
      selection: 'rgba(56,189,248,0.3)',
      ansi: [
        '#0f172a', '#f87171', '#4ade80', '#facc15',
        '#60a5fa', '#c084fc', '#22d3ee', '#94a3b8',
        '#475569', '#fca5a5', '#86efac', '#fde68a',
        '#93c5fd', '#d8b4fe', '#67e8f9', '#f1f5f9'
      ]
    }
  },
  {
    id: 'quickssh-dracula',
    name: 'Dracula',
    isDark: true,
    colors: {
      bg: '33 34 44',
      bgAlt: '40 42 54',
      surface: '54 56 72',
      border: '98 114 164',
      text: '248 248 242',
      textMuted: '139 143 164',
      accent: '189 147 249',
      accentHover: '166 120 240'
    },
    terminal: {
      background: '#21222c',
      foreground: '#f8f8f2',
      cursor: '#bd93f9',
      selection: 'rgba(189,147,249,0.3)',
      ansi: [
        '#21222c', '#ff5555', '#50fa7b', '#f1fa8c',
        '#bd93f9', '#ff79c6', '#8be9fd', '#bf9eee',
        '#6272a4', '#ff6e6e', '#69ff94', '#ffffa5',
        '#d6acff', '#ff92df', '#a4ffff', '#ffffff'
      ]
    }
  }
]

export function getThemeById(id: string): ThemeDefinition | undefined {
  return builtInThemes.find((t) => t.id === id)
}
