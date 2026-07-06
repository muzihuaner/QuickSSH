import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTerminal,
  faChartLine,
  faLock,
  faServer,
  faFolderOpen,
  faBolt,
  faClock
} from '@fortawesome/free-solid-svg-icons'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { useAppStore } from '../../store/app'
import { useCommandsStore } from '../../store/commands'
import { useTabsStore } from '../../store/tabs'
import { useCredentialsStore } from '../../store/credentials'

interface PaletteItem {
  id: string
  label: string
  description: string
  icon: IconProp
  action: () => void
  group: string
}

export default function CommandPalette() {
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const commands = useCommandsStore((s) => s.commands)
  const history = useCommandsStore((s) => s.history)
  const addHistory = useCommandsStore((s) => s.addHistory)
  const tabs = useTabsStore((s) => s.tabs)
  const activeId = useTabsStore((s) => s.activeId)
  const addTab = useTabsStore((s) => s.addTab)
  const credentials = useCredentialsStore((s) => s.credentials)
  const [query, setQuery] = useState('')
  const [selIndex, setSelIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 向当前 SSH 终端发送命令
  const sendToActiveTerminal = (command: string) => {
    const activeTab = tabs.find((t) => t.id === activeId)
    if (activeTab?.kind === 'ssh' || activeTab?.kind === 'local') {
      window.quickssh[activeTab.kind === 'ssh' ? 'ssh' : 'local'].input(activeTab.id, command + '\r')
      void addHistory(command, activeTab.credentialId)
    }
  }

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = []

    // 内置操作
    list.push({
      id: 'act:local',
      label: '新建本地终端',
      description: '在当前窗口打开本地终端标签',
      icon: faTerminal,
      group: '操作',
      action: () => addTab('local', '本地终端')
    })
    list.push({
      id: 'act:monitor',
      label: '切换资源监控面板',
      description: '为当前 SSH 会话开启/关闭监控',
      icon: faChartLine,
      group: '操作',
      action: () => {
        const sshTab = tabs.find((t) => t.kind === 'ssh')
        if (sshTab) {
          useAppStore.getState().setMonitorTabId(
            useAppStore.getState().monitorTabId === sshTab.id ? null : sshTab.id
          )
        }
      }
    })
    list.push({
      id: 'act:lock',
      label: '锁定应用 (暂离保护)',
      description: '立即锁定界面',
      icon: faLock,
      group: '操作',
      action: () => {
        window.quickssh.lock.request()
        useAppStore.getState().setLocked(true)
      }
    })

    // 主机连接
    for (const c of credentials) {
      list.push({
        id: `host:${c.id}`,
        label: `连接 ${c.name}`,
        description: `${c.username}@${c.host}:${c.port}`,
        icon: faServer,
        group: '主机',
        action: () => addTab('ssh', c.name, { credentialId: c.id })
      })
      list.push({
        id: `sftp:${c.id}`,
        label: `SFTP ${c.name}`,
        description: `打开 ${c.host} 的文件管理器`,
        icon: faFolderOpen,
        group: '主机',
        action: () => addTab('sftp', `SFTP · ${c.name}`, { credentialId: c.id })
      })
    }

    // 自定义命令
    for (const cmd of commands) {
      list.push({
        id: `cmd:${cmd.id}`,
        label: cmd.name,
        description: cmd.command,
        icon: faBolt,
        group: '自定义命令',
        action: () => sendToActiveTerminal(cmd.command)
      })
    }

    // 历史命令
    for (const h of [...history].reverse().slice(0, 30)) {
      list.push({
        id: `hist:${h.id}`,
        label: h.command,
        description: '历史命令',
        icon: faClock,
        group: '历史',
        action: () => sendToActiveTerminal(h.command)
      })
    }

    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands, history, credentials, tabs, activeId])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return items
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q)
    )
  }, [query, items])

  useEffect(() => {
    setSelIndex(0)
  }, [query])

  const execute = (item: PaletteItem) => {
    item.action()
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selIndex]) execute(filtered[selIndex])
    }
  }

  // 分组渲染
  let lastGroup = ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="animate-fade-in flex w-[640px] max-w-[90vw] flex-col overflow-hidden rounded-lg border border-border bg-bg-alt shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="输入命令、主机名或搜索..."
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-text-muted"
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-text-muted">无匹配结果</div>
          ) : (
            filtered.map((item, idx) => {
              const showGroup = item.group !== lastGroup
              lastGroup = item.group
              return (
                <div key={item.id}>
                  {showGroup && (
                    <div className="px-4 pb-1 pt-2 text-xs font-medium text-text-muted">
                      {item.group}
                    </div>
                  )}
                  <div
                    onClick={() => execute(item)}
                    onMouseEnter={() => setSelIndex(idx)}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm ${
                      idx === selIndex ? 'bg-accent text-white' : 'hover:bg-surface'
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-4" />
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate font-medium">{item.label}</div>
                      <div
                        className={`truncate text-xs ${
                          idx === selIndex ? 'text-white/70' : 'text-text-muted'
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="border-t border-border px-4 py-2 text-xs text-text-muted">
          <kbd className="rounded bg-surface px-1.5">↑↓</kbd> 导航 ·
          <kbd className="ml-1 rounded bg-surface px-1.5">Enter</kbd> 执行 ·
          <kbd className="ml-1 rounded bg-surface px-1.5">Esc</kbd> 关闭
        </div>
      </div>
    </div>
  )
}
