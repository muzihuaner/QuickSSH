import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKeyboard } from '@fortawesome/free-solid-svg-icons'
import { useTabsStore } from '../../store/tabs'
import TabBar from './TabBar'
import SshTerminalView from '../terminal/SshTerminalView'
import LocalTerminalView from '../terminal/LocalTerminalView'
import SftpView from '../sftp/SftpView'

/**
 * 统一 Workbench - keep-mounted 策略
 * 所有标签内容常驻 DOM，仅通过 visibility 切换显隐
 * 保证 xterm 实例与终端状态不被销毁
 */
export default function Workbench() {
  const tabs = useTabsStore((s) => s.tabs)
  const activeId = useTabsStore((s) => s.activeId)

  if (tabs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mb-3 text-5xl opacity-20">
            <FontAwesomeIcon icon={faKeyboard} />
          </div>
          <p className="text-sm text-text-muted">
            按 <kbd className="rounded bg-surface px-1.5 py-0.5 text-xs">Ctrl+K</kbd> 打开命令面板
          </p>
          <p className="mt-1 text-xs text-text-muted">
            或在左侧选择主机开始 SSH 会话
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TabBar />
      <div className="relative flex-1 overflow-hidden">
        {tabs.map((tab) => {
          const visible = tab.id === activeId
          return (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{ display: visible ? 'block' : 'none' }}
            >
              {tab.kind === 'ssh' && (
                <SshTerminalView tabId={tab.id} credentialId={tab.credentialId!} active={visible} />
              )}
              {tab.kind === 'local' && <LocalTerminalView tabId={tab.id} active={visible} />}
              {tab.kind === 'sftp' && (
                <SftpView tabId={tab.id} credentialId={tab.credentialId!} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
