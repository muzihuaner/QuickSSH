import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock } from '@fortawesome/free-solid-svg-icons'
import { useAppStore } from '../store/app'

/**
 * 暂离保护锁屏 - 遮罩整个应用界面，需确认解锁
 * 解锁采用二次确认机制，避免误触
 */
export default function LockScreen() {
  const setLocked = useAppStore((s) => s.setLocked)
  const [confirming, setConfirming] = useState(false)

  const unlock = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLocked(false)
    setConfirming(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface">
          <FontAwesomeIcon icon={faLock} className="text-3xl text-text-muted" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white">应用已锁定</h1>
          <p className="mt-1 text-sm text-white/50">暂离保护已激活，终端会话保持后台运行</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={unlock}
            className="rounded-lg bg-accent px-8 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            {confirming ? '再次点击确认解锁' : '解锁'}
          </button>
          {confirming && (
            <button
              onClick={() => setConfirming(false)}
              className="text-xs text-white/40 hover:text-white/70"
            >
              取消
            </button>
          )}
        </div>
        <p className="mt-4 text-xs text-white/30">
          QuickSSH · 沉浸式运维
        </p>
      </div>
    </div>
  )
}
