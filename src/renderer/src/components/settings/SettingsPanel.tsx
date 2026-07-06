import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPalette, faKeyboard, faCircleInfo, faXmark, faMoon, faSun, faBolt } from '@fortawesome/free-solid-svg-icons'
import { useThemeStore } from '../../store/theme'

type TabId = 'theme' | 'terminal' | 'about'

interface TerminalSettings {
  fontSize: number
  fontFamily: string
  cursorBlink: boolean
}

const defaultTerminalSettings: TerminalSettings = {
  fontSize: 14,
  fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  cursorBlink: true
}

function loadTerminalSettings(): TerminalSettings {
  try {
    const raw = localStorage.getItem('quickssh-terminal-settings')
    if (!raw) return { ...defaultTerminalSettings }
    return { ...defaultTerminalSettings, ...JSON.parse(raw) }
  } catch {
    return { ...defaultTerminalSettings }
  }
}

function saveTerminalSettings(s: TerminalSettings): void {
  localStorage.setItem('quickssh-terminal-settings', JSON.stringify(s))
  // 通知所有终端刷新
  window.dispatchEvent(new CustomEvent('quickssh-terminal-settings-change', { detail: s }))
}

export function getTerminalSettings(): TerminalSettings {
  return loadTerminalSettings()
}

interface Props {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: Props) {
  const [tab, setTab] = useState<TabId>('theme')
  const themes = useThemeStore((s) => s.themes)
  const activeThemeId = useThemeStore((s) => s.activeThemeId)
  const setTheme = useThemeStore((s) => s.setTheme)
  const [terminal, setTerminal] = useState<TerminalSettings>(loadTerminalSettings)

  const updateTerminal = (patch: Partial<TerminalSettings>) => {
    const next = { ...terminal, ...patch }
    setTerminal(next)
    saveTerminalSettings(next)
  }

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'theme', label: '主题', icon: faPalette },
    { id: 'terminal', label: '终端', icon: faKeyboard },
    { id: 'about', label: '关于', icon: faCircleInfo }
  ]

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[640px] max-w-[90vw] overflow-hidden rounded-lg border border-border bg-bg-alt shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 + 标签栏 */}
        <div className="flex items-center border-b border-border">
          <div className="flex flex-1 items-center gap-1 px-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${
                  tab === t.id
                    ? 'border-accent text-text'
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                <FontAwesomeIcon icon={t.icon} className="w-3" />
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="mx-3 rounded px-2 py-1 text-sm text-text-muted hover:bg-surface">
            <FontAwesomeIcon icon={faXmark} className="w-3" />
          </button>
        </div>

        {/* 内容 */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {tab === 'theme' && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">选择配色方案</h3>
              <div className="grid grid-cols-2 gap-3">
                {themes.map((theme) => {
                  const active = theme.id === activeThemeId
                  const c = theme.colors
                  return (
                    <button
                      key={theme.id}
                      onClick={() => void setTheme(theme.id)}
                      className={`overflow-hidden rounded-lg border-2 text-left transition-all ${
                        active ? 'border-accent' : 'border-border hover:border-text-muted'
                      }`}
                    >
                      <div className="flex h-20 items-center gap-2 px-3" style={{ background: `rgb(${c.bg})` }}>
                        <div className="h-3 w-3 rounded-full" style={{ background: `rgb(${c.accent})` }} />
                        <div className="flex-1">
                          <div className="h-2 w-16 rounded" style={{ background: `rgb(${c.text})` }} />
                          <div className="mt-1 h-1.5 w-10 rounded" style={{ background: `rgb(${c.textMuted})` }} />
                        </div>
                        <div
                          className="rounded px-1.5 py-0.5 text-[10px]"
                          style={{ background: `rgb(${c.surface})`, color: `rgb(${c.text})` }}
                        >
                          $ _
                        </div>
                      </div>
                      <div
                        className="flex items-center justify-between px-3 py-2"
                        style={{ background: `rgb(${c.bgAlt})`, color: `rgb(${c.text})` }}
                      >
                        <span className="text-sm font-medium">{theme.name}</span>
                        <span className="text-xs opacity-60 flex items-center gap-1">
                          <FontAwesomeIcon icon={theme.isDark ? faMoon : faSun} className="w-2.5" />
                          {theme.isDark ? '暗色' : '亮色'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'terminal' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">字体大小</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={10}
                    max={24}
                    step={1}
                    value={terminal.fontSize}
                    onChange={(e) => updateTerminal({ fontSize: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-accent"
                  />
                  <span className="w-10 text-right text-sm font-mono">{terminal.fontSize}px</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">字体</label>
                <select
                  value={terminal.fontFamily}
                  onChange={(e) => updateTerminal({ fontFamily: e.target.value })}
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value='"JetBrains Mono", "Cascadia Code", Consolas, monospace'>JetBrains Mono</option>
                  <option value='"Fira Code", "Cascadia Code", Consolas, monospace'>Fira Code</option>
                  <option value='"Cascadia Code", Consolas, monospace'>Cascadia Code</option>
                  <option value='Consolas, monospace'>Consolas</option>
                  <option value='monospace'>monospace</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="cursor-blink"
                  type="checkbox"
                  checked={terminal.cursorBlink}
                  onChange={(e) => updateTerminal({ cursorBlink: e.target.checked })}
                  className="accent-accent"
                />
                <label htmlFor="cursor-blink" className="text-sm">光标闪烁</label>
              </div>

              <div className="rounded border border-border bg-surface p-3">
                <p className="text-xs text-text-muted">预览效果</p>
                <p className="mt-1 text-sm" style={{ fontFamily: terminal.fontFamily, fontSize: terminal.fontSize }}>
                  $ echo &quot;Hello, QuickSSH!&quot;
                </p>
                <p className="text-sm" style={{ fontFamily: terminal.fontFamily, fontSize: terminal.fontSize }}>
                  Hello, QuickSSH!
                </p>
              </div>
            </div>
          )}

          {tab === 'about' && (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent text-2xl">
                  <FontAwesomeIcon icon={faBolt} className="text-white" />
                </div>
              </div>
              <h2 className="mb-1 text-lg font-semibold">QuickSSH</h2>
              <p className="mb-4 text-xs text-text-muted">版本 1.0.0</p>
              <p className="mb-4 text-sm text-text-muted">跨平台 SSH 与 SFTP 客户端，单窗口沉浸式运维体验。</p>
              <div className="space-y-1 text-xs text-text-muted">
                <p>Electron + React + Vite + Tailwind CSS</p>
                <p>SSH 驱动：ssh2 / xterm.js</p>
                <p>本地终端：node-pty</p>
              </div>
              <a
                href="https://github.com/muzihuaner/quickssh"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-xs text-accent hover:underline"
              >
                github.com/muzihuaner/quickssh
              </a>
              <p className="mt-4 text-[10px] text-text-muted/50">QuickSSH · MIT License</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
