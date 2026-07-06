import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPalette, faXmark, faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { useThemeStore } from '../../store/theme'

interface Props {
  onClose: () => void
}

export default function ThemeSettings({ onClose }: Props) {
  const themes = useThemeStore((s) => s.themes)
  const activeThemeId = useThemeStore((s) => s.activeThemeId)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[560px] max-w-[90vw] overflow-hidden rounded-lg border border-border bg-bg-alt shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FontAwesomeIcon icon={faPalette} className="w-3.5 text-accent" />
            主题设置
          </h2>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm hover:bg-surface">
            <FontAwesomeIcon icon={faXmark} className="w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
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
                {/* 预览 */}
                <div
                  className="flex h-20 items-center gap-2 px-3"
                  style={{ background: `rgb(${c.bg})` }}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: `rgb(${c.accent})` }}
                  />
                  <div className="flex-1">
                    <div className="h-2 w-16 rounded" style={{ background: `rgb(${c.text})` }} />
                    <div
                      className="mt-1 h-1.5 w-10 rounded"
                      style={{ background: `rgb(${c.textMuted})` }}
                    />
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
    </div>
  )
}
