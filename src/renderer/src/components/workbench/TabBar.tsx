import { useTabsStore } from '../../store/tabs'
import { useAppStore } from '../../store/app'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faServer, faTerminal, faFolderOpen, faChartLine, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import type { TabKind } from '@shared/types'

const kindIcon: Record<TabKind, IconProp> = {
  ssh: faServer,
  local: faTerminal,
  sftp: faFolderOpen
}

export default function TabBar() {
  const tabs = useTabsStore((s) => s.tabs)
  const activeId = useTabsStore((s) => s.activeId)
  const setActive = useTabsStore((s) => s.setActive)
  const closeTab = useTabsStore((s) => s.closeTab)
  const monitorTabId = useAppStore((s) => s.monitorTabId)
  const setMonitorTabId = useAppStore((s) => s.setMonitorTabId)

  return (
    <div className="flex items-stretch border-b border-border bg-bg-alt">
      <div className="flex flex-1 items-stretch overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.id === activeId
          return (
            <div
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`group flex cursor-pointer items-center gap-2 border-r border-border px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-bg text-text'
                  : 'bg-bg-alt text-text-muted hover:bg-surface'
              }`}
              style={active ? { borderBottom: '2px solid rgb(var(--color-accent))' } : undefined}
            >
              <FontAwesomeIcon icon={kindIcon[tab.kind]} className="w-3 text-text-muted" />
              <span className="max-w-[140px] truncate">{tab.title}</span>
              {tab.kind === 'ssh' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMonitorTabId(monitorTabId === tab.id ? null : tab.id)
                  }}
                  className={`text-xs ${monitorTabId === tab.id ? 'text-accent' : 'opacity-0 group-hover:opacity-100'}`}
                  title="切换监控"
                >
                  <FontAwesomeIcon icon={faChartLine} className="w-3" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                className="ml-1 flex h-4 w-4 items-center justify-center rounded text-xs opacity-0 hover:bg-border group-hover:opacity-100"
                title="关闭"
              >
                <FontAwesomeIcon icon={faXmark} className="w-2.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
