import * as pty from 'node-pty'
import { platform } from 'os'

interface LocalSession {
  id: string
  proc: pty.IPty
}

/** 本地终端管理器 - 基于 node-pty，keep-mounted 常驻 */
export class LocalTerminalManager {
  private sessions = new Map<string, LocalSession>()

  spawn(
    id: string,
    opts: { cwd?: string; cols?: number; rows?: number },
    onData: (data: string) => void,
    onClose: (exitCode: number) => void
  ): void {
    const shell = platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'
    const proc = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: opts.cols ?? 80,
      rows: opts.rows ?? 24,
      cwd: opts.cwd ?? process.env.HOME,
      env: process.env as Record<string, string>
    })
    proc.onData((data) => onData(data))
    proc.onExit(({ exitCode }) => onClose(exitCode))
    this.sessions.set(id, { id, proc })
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.proc.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    try {
      this.sessions.get(id)?.proc.resize(cols, rows)
    } catch {
      /* ignore resize before ready */
    }
  }

  close(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    try {
      session.proc.kill()
    } catch {
      /* ignore */
    }
    this.sessions.delete(id)
  }
}

export const localTerminalManager = new LocalTerminalManager()
