import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBolt,
  faWindowMinimize,
  faWindowMaximize,
  faXmark
} from '@fortawesome/free-solid-svg-icons'

/**
 * VS Code 风格自定义标题栏
 * - 左侧：应用图标 + 标题（可拖拽区域）
 * - 右侧：最小化 / 最大化 / 关闭按钮
 */
export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // 初始化时检测最大化状态
    window.quickssh.window.isMaximized().then(setIsMaximized)

    // 监听窗口最大化/恢复事件
    const handler = (_e: any) => {
      window.quickssh.window.isMaximized().then(setIsMaximized)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div className="draggable-region flex h-8 items-center justify-between bg-titlebar border-b border-border/50 select-none">
      {/* 左侧：标题区域（可拖拽） */}
      <div className="draggable-region flex items-center gap-2 px-3">
        <FontAwesomeIcon icon={faBolt} className="text-accent text-xs" />
        <span className="text-xs text-text font-medium tracking-wide">QuickSSH</span>
      </div>

      {/* 右侧：窗口控制按钮（不可拖拽） */}
      <div className="no-drag flex items-center">
        <button
          onClick={() => window.quickssh.window.minimize()}
          className="no-drag h-8 w-11 inline-flex items-center justify-center text-text-muted hover:bg-white/10 transition-colors"
          title="最小化"
        >
          <FontAwesomeIcon icon={faWindowMinimize} className="text-[10px]" />
        </button>
        <button
          onClick={() => window.quickssh.window.maximize()}
          className="no-drag h-8 w-11 inline-flex items-center justify-center text-text-muted hover:bg-white/10 transition-colors"
          title={isMaximized ? '还原' : '最大化'}
        >
          <FontAwesomeIcon icon={faWindowMaximize} className={`text-[10px] ${isMaximized ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => window.quickssh.window.close()}
          className="no-drag h-8 w-11 inline-flex items-center justify-center text-text-muted hover:bg-red-500 hover:text-white transition-colors"
          title="关闭"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xs" />
        </button>
      </div>
    </div>
  )
}
