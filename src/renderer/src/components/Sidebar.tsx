import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTerminal,
  faKeyboard,
  faChartLine,
  faChevronRight,
  faChevronDown,
  faServer,
  faFolderOpen,
  faGear
} from '@fortawesome/free-solid-svg-icons'
import { useCredentialsStore } from '../store/credentials'
import { useTabsStore } from '../store/tabs'
import { useAppStore } from '../store/app'
import CredentialsManager from './credentials/CredentialsManager'
import SettingsPanel from './settings/SettingsPanel'

export default function Sidebar() {
  const credentials = useCredentialsStore((s) => s.credentials)
  const loaded = useCredentialsStore((s) => s.loaded)
  const addTab = useTabsStore((s) => s.addTab)
  const tabs = useTabsStore((s) => s.tabs)
  const setMonitorTabId = useAppStore((s) => s.setMonitorTabId)
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const [showCred, setShowCred] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // 按分组聚合主机
  const groups = useMemo(() => {
    const map = new Map<string, typeof credentials>()
    for (const c of credentials) {
      const g = c.group?.trim() || '未分组'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(c)
    }
    return Array.from(map.entries())
  }, [credentials])

  const toggleGroup = (g: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }

  const openSsh = (credId: string, name: string) => {
    addTab('ssh', name, { credentialId: credId })
  }

  const openLocal = () => {
    addTab('local', '本地终端')
  }

  const openSftp = (credId: string, name: string) => {
    addTab('sftp', `SFTP · ${name}`, { credentialId: credId })
  }

  const toggleMonitor = () => {
    const sshTab = tabs.find((t) => t.kind === 'ssh')
    if (sshTab) {
      setMonitorTabId(sshTab.id)
    }
  }

  return (
    <>
      <aside className="flex w-60 flex-col border-r border-border bg-bg-alt">
        {/* 快速操作 */}
        <div className="flex flex-col gap-1 px-2 pt-3">
          <button
            onClick={openLocal}
            className="flex items-center gap-2 rounded px-3 py-1.5 text-left text-sm hover:bg-surface"
          >
            <FontAwesomeIcon icon={faTerminal} className="w-3.5 text-text-muted" />
            <span>本地终端</span>
          </button>
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 rounded px-3 py-1.5 text-left text-sm hover:bg-surface"
          >
            <FontAwesomeIcon icon={faKeyboard} className="w-3.5 text-text-muted" />
            <span>命令面板</span>
          </button>
          <button
            onClick={toggleMonitor}
            className="flex items-center gap-2 rounded px-3 py-1.5 text-left text-sm hover:bg-surface"
          >
            <FontAwesomeIcon icon={faChartLine} className="w-3.5 text-text-muted" />
            <span>资源监控</span>
          </button>
        </div>

        <div className="mx-3 my-2 border-t border-border" />

        {/* 主机列表 */}
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-xs font-medium text-text-muted">主机</span>
          <button
            onClick={() => setShowCred(true)}
            className="text-xs text-accent hover:underline"
          >
            + 管理
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {!loaded ? (
            <p className="px-2 py-2 text-xs text-text-muted">加载中...</p>
          ) : credentials.length === 0 ? (
            <button
              onClick={() => setShowCred(true)}
              className="w-full rounded border border-dashed border-border px-3 py-3 text-center text-xs text-text-muted hover:border-accent"
            >
              + 添加 SSH 主机
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              {groups.map(([groupName, creds]) => {
                const isCollapsed = collapsed.has(groupName)
                return (
                  <div key={groupName}>
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="flex w-full items-center gap-1 px-1 py-1 text-xs font-medium text-text-muted hover:text-text"
                    >
                      <FontAwesomeIcon
                        icon={isCollapsed ? faChevronRight : faChevronDown}
                        className="w-2.5 text-text-muted"
                      />
                      <span className="truncate">{groupName}</span>
                      <span className="ml-auto rounded bg-surface px-1.5 text-[10px]">
                        {creds.length}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <ul className="ml-1 flex flex-col gap-0.5 border-l border-border pl-1">
                        {creds.map((c) => (
                          <li key={c.id} className="group">
                            <div className="flex items-center rounded px-2 py-1.5 hover:bg-surface">
                              <FontAwesomeIcon icon={faServer} className="mr-2 w-3 text-text-muted" />
                              <button
                                onClick={() => openSsh(c.id, c.name)}
                                className="flex-1 truncate text-left text-sm"
                                title={`${c.username}@${c.host}:${c.port}`}
                              >
                                {c.name}
                              </button>
                              <button
                                onClick={() => openSftp(c.id, c.name)}
                                className="ml-1 hidden text-xs text-text-muted hover:text-accent group-hover:inline"
                                title="打开 SFTP"
                              >
                                <FontAwesomeIcon icon={faFolderOpen} className="w-3" />
                              </button>
                            </div>
                            <div className="ml-7 truncate text-[10px] text-text-muted">
                              {c.username}@{c.host}:{c.port}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center border-t border-border px-3 py-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors"
            title="设置"
          >
            <FontAwesomeIcon icon={faGear} className="w-3" />
            设置
          </button>
        </div>
      </aside>

      {showCred && <CredentialsManager onClose={() => setShowCred(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  )
}
