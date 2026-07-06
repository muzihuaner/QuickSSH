import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import { useThemeStore } from '../../store/theme'
import { useCommandsStore } from '../../store/commands'
import { getTerminalSettings } from '../settings/SettingsPanel'


interface Props {
  tabId: string
  credentialId: string
  active: boolean
}

type ConnState = 'connecting' | 'connected' | 'error'

/**
 * SSH 远端终端视图 - xterm.js + WebGL 加速
 * keep-mounted: 组件一旦挂载即保持，切换标签时仅隐藏
 */
export default function SshTerminalView({ tabId, credentialId, active }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const connectedRef = useRef(false)
  const [connState, setConnState] = useState<ConnState>('connecting')
  const [errorMsg, setErrorMsg] = useState('')
  const activeTheme = useThemeStore((s) => s.activeTheme)
  const addHistory = useCommandsStore((s) => s.addHistory)

  const doConnect = useCallback(() => {
    const term = termRef.current
    if (!term) return
    setConnState('connecting')
    setErrorMsg('')
    term.write('\x1b[33m[正在连接...]\x1b[0m\r\n')

    const cols = term.cols
    const rows = term.rows
    window.quickssh.ssh
      .connect(tabId, credentialId, cols, rows)
      .then(() => {
        connectedRef.current = true
        setConnState('connected')
        term.focus()
      })
      .catch((err) => {
        setConnState('error')
        setErrorMsg(err.message)
        connectedRef.current = false
        term.write(`\x1b[31m[连接失败] ${err.message}\x1b[0m\r\n`)
      })
  }, [tabId, credentialId])

  // 初始化 xterm 并连接
  useEffect(() => {
    if (termRef.current || !containerRef.current) return

    const settings = getTerminalSettings()
    const theme = activeTheme?.terminal
    const term = new Terminal({
      cursorBlink: settings.cursorBlink,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      allowProposedApi: true,
      theme: theme
        ? {
            background: theme.background,
            foreground: theme.foreground,
            cursor: theme.cursor,
            selection: theme.selection as any,
            black: theme.ansi[0],
            red: theme.ansi[1],
            green: theme.ansi[2],
            yellow: theme.ansi[3],
            blue: theme.ansi[4],
            magenta: theme.ansi[5],
            cyan: theme.ansi[6],
            white: theme.ansi[7],
            brightBlack: theme.ansi[8],
            brightRed: theme.ansi[9],
            brightGreen: theme.ansi[10],
            brightYellow: theme.ansi[11],
            brightBlue: theme.ansi[12],
            brightMagenta: theme.ansi[13],
            brightCyan: theme.ansi[14],
            brightWhite: theme.ansi[15]
          }
        : undefined
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    try {
      term.loadAddon(new WebglAddon())
    } catch {
      // WebGL 不可用时回退到 canvas
    }
    term.open(containerRef.current)
    fit.fit()
    termRef.current = term
    fitRef.current = fit

    // 监听终端设置变化
    const onSettingsChange = (e: any) => {
      const s = e.detail as ReturnType<typeof getTerminalSettings>
      term.options.fontSize = s.fontSize
      term.options.fontFamily = s.fontFamily
      term.options.cursorBlink = s.cursorBlink
      fit.fit()
    }
    window.addEventListener('quickssh-terminal-settings-change', onSettingsChange as any)

    // 输入转发
    const inputDisp = term.onData((data) => {
      window.quickssh.ssh.input(tabId, data)
      // 记录回车命令到历史
      if (data === '\r') {
        const line = term.buffer.active
          .getLine(term.buffer.active.cursorY)?.translateToString(true)
        if (line && line.trim()) {
          void addHistory(line.trim(), credentialId)
        }
      }
    })

    // 接收远端输出
    const offData = window.quickssh.ssh.onData((tid, data) => {
      if (tid === tabId) term.write(data)
    })
    const offClosed = window.quickssh.ssh.onClosed((tid) => {
      if (tid === tabId) {
        term.write('\r\n\x1b[31m[连接已关闭]\x1b[0m\r\n')
        connectedRef.current = false
        setConnState('error')
        setErrorMsg('连接已断开')
      }
    })

    // 建立连接
    doConnect()

    return () => {
      window.removeEventListener('quickssh-terminal-settings-change', onSettingsChange as any)
      inputDisp.dispose()
      offData?.()
      offClosed?.()
      window.quickssh.ssh.close(tabId)
      term.dispose()
      termRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 主题变化时更新终端配色
  useEffect(() => {
    if (!termRef.current || !activeTheme) return
    const t = activeTheme.terminal
    termRef.current.options.theme = {
      background: t.background,
      foreground: t.foreground,
      cursor: t.cursor,
      selection: t.selection as any,
      black: t.ansi[0],
      red: t.ansi[1],
      green: t.ansi[2],
      yellow: t.ansi[3],
      blue: t.ansi[4],
      magenta: t.ansi[5],
      cyan: t.ansi[6],
      white: t.ansi[7],
      brightBlack: t.ansi[8],
      brightRed: t.ansi[9],
      brightGreen: t.ansi[10],
      brightYellow: t.ansi[11],
      brightBlue: t.ansi[12],
      brightMagenta: t.ansi[13],
      brightCyan: t.ansi[14],
      brightWhite: t.ansi[15]
    } as any
  }, [activeTheme])

  // 激活时重新 fit 并聚焦
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => {
      try {
        fitRef.current?.fit()
        const term = termRef.current
        if (term) {
          window.quickssh.ssh.resize(tabId, term.cols, term.rows)
          term.focus()
        }
      } catch {
        /* ignore */
      }
    }, 30)
    return () => clearTimeout(timer)
  }, [active, tabId])

  // 窗口缩放
  useEffect(() => {
    const onResize = () => {
      if (!active) return
      try {
        fitRef.current?.fit()
        const term = termRef.current
        if (term) window.quickssh.ssh.resize(tabId, term.cols, term.rows)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [active, tabId])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {/* 连接失败遮罩 + 重试按钮 */}
      {connState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
          <div className="mb-2 text-red-400 text-sm">{errorMsg}</div>
          <button
            onClick={() => doConnect()}
            className="rounded bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80 transition-colors"
          >
            重新连接
          </button>
        </div>
      )}
      {/* 连接中提示 */}
      {connState === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <span className="text-text-muted text-sm animate-pulse">正在连接...</span>
        </div>
      )}
    </div>
  )
}
