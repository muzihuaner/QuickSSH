import { useEffect } from 'react'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import Workbench from './components/workbench/Workbench'
import CommandPalette from './components/command/CommandPalette'
import LockScreen from './components/LockScreen'
import MonitorPanel from './components/monitor/MonitorPanel'
import { useThemeStore } from './store/theme'
import { useCredentialsStore } from './store/credentials'
import { useCommandsStore } from './store/commands'
import { useAppStore } from './store/app'

export default function App() {
  const loadTheme = useThemeStore((s) => s.load)
  const loadCreds = useCredentialsStore((s) => s.load)
  const loadCommands = useCommandsStore((s) => s.load)
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const locked = useAppStore((s) => s.locked)
  const monitorTabId = useAppStore((s) => s.monitorTabId)
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen)

  useEffect(() => {
    void loadTheme()
    void loadCreds()
    void loadCommands()

    // 全局快捷键呼出命令面板
    const offPalette = window.quickssh.onCommandPalette(() => setCommandPaletteOpen(true))

    // 暂离保护锁定监听
    const offLock = window.quickssh.lock.onLocked(() => {
      useAppStore.getState().setLocked(true)
    })

    // Ctrl+Shift+P / Cmd+K 本地快捷键
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      offPalette?.()
      offLock?.()
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-bg text-text">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Workbench />
          {monitorTabId && <MonitorPanel tabId={monitorTabId} />}
        </div>
      </div>
      {commandPaletteOpen && <CommandPalette />}
      {locked && <LockScreen />}
    </div>
  )
}
