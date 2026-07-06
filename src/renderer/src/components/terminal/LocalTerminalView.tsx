import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import { useThemeStore } from '../../store/theme'

interface Props {
  tabId: string
  active: boolean
}

/** 本地终端视图 - 基于 node-pty */
export default function LocalTerminalView({ tabId, active }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const activeTheme = useThemeStore((s) => s.activeTheme)

  useEffect(() => {
    if (termRef.current || !containerRef.current) return

    const theme = activeTheme?.terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
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
      /* fallback */
    }
    term.open(containerRef.current)
    fit.fit()
    termRef.current = term
    fitRef.current = fit

    const inputDisp = term.onData((data) => {
      window.quickssh.local.input(tabId, data)
    })

    const offData = window.quickssh.local.onData((tid, data) => {
      if (tid === tabId) term.write(data)
    })
    const offClosed = window.quickssh.local.onClosed((tid, exitCode) => {
      if (tid === tabId) term.write(`\r\n\x1b[31m[进程已退出 code=${exitCode}]\x1b[0m\r\n`)
    })

    void window.quickssh.local.spawn(tabId, {}, term.cols, term.rows).then(() => {
      term.focus()
    })

    return () => {
      inputDisp.dispose()
      offData?.()
      offClosed?.()
      window.quickssh.local.close(tabId)
      term.dispose()
      termRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => {
      try {
        fitRef.current?.fit()
        const term = termRef.current
        if (term) {
          window.quickssh.local.resize(tabId, term.cols, term.rows)
          term.focus()
        }
      } catch {
        /* ignore */
      }
    }, 30)
    return () => clearTimeout(timer)
  }, [active, tabId])

  useEffect(() => {
    const onResize = () => {
      if (!active) return
      try {
        fitRef.current?.fit()
        const term = termRef.current
        if (term) window.quickssh.local.resize(tabId, term.cols, term.rows)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [active, tabId])

  return <div ref={containerRef} className="h-full w-full" />
}
