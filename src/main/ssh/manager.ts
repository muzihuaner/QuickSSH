import { Client, ClientChannel, PseudoTtyOptions, ConnectConfig } from 'ssh2'
import type { HostCredential } from '@shared/types'

export interface SshSession {
  id: string
  conn: Client
  stream?: ClientChannel
  sftp?: import('ssh2').SFTPWrapper
  credential: HostCredential
  ready: boolean
}

/**
 * SSH 会话管理器 - 维护以 tab id 为键的持久连接
 * 提供 shell 交互、SFTP 通道复用与资源监控通道
 */
export class SshManager {
  private sessions = new Map<string, SshSession>()

  private buildConfig(cred: HostCredential): ConnectConfig {
    const cfg: ConnectConfig = {
      host: cred.host,
      port: cred.port,
      username: cred.username,
      readyTimeout: 20000,
      keepaliveInterval: 10000,
      tryKeyboard: true
    }
    if (cred.authType === 'privateKey') {
      cfg.privateKey = cred.privateKey
      if (cred.passphrase) cfg.passphrase = cred.passphrase
    } else {
      cfg.password = cred.password
    }
    return cfg
  }

  connect(tabId: string, cred: HostCredential): Promise<SshSession> {
    // 先清理可能残留的失效会话，确保重试不受阻
    this.sessions.delete(tabId)

    return new Promise((resolve, reject) => {
      const conn = new Client()
      let isReady = false

      conn.on('ready', () => {
        isReady = true
        const session: SshSession = {
          id: tabId,
          conn,
          credential: cred,
          ready: true
        }
        this.sessions.set(tabId, session)
        resolve(session)
      })
      conn.on('error', (err) => {
        if (!isReady) {
          // 连接建立前出错，拒绝 Promise 并断开底层连接
          reject(err)
          try { conn.end() } catch { /* ignore */ }
        } else {
          this.emitError(tabId, err)
        }
      })
      conn.on('close', () => {
        this.cleanup(tabId)
      })
      conn.on('end', () => {
        this.cleanup(tabId)
      })
      // 支持 keyboard-interactive 认证 (很多服务器要求此方式而非纯 password)
      conn.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => {
        const answers = prompts.map(() => cred.password || '')
        finish(answers)
      })

      conn.connect(this.buildConfig(cred))
    })
  }

  /** 打开交互式 PTY shell */
  openShell(
    tabId: string,
    cols: number,
    rows: number,
    onData: (data: string) => void,
    onClose: () => void
  ): Promise<void> {
    const session = this.sessions.get(tabId)
    if (!session) return Promise.reject(new Error('SSH 会话不存在'))

    return new Promise((resolve, reject) => {
      const tty: PseudoTtyOptions = {
        rows,
        cols,
        term: 'xterm-256color'
      }
      session.conn.shell(tty, (err, stream) => {
        if (err) return reject(err)
        session.stream = stream
        stream.on('data', (chunk: Buffer) => onData(chunk.toString('utf-8')))
        stream.on('close', () => onClose())
        stream.stderr.on('data', (chunk: Buffer) => onData(chunk.toString('utf-8')))
        resolve()
      })
    })
  }

  write(tabId: string, data: string): void {
    const session = this.sessions.get(tabId)
    if (session?.stream?.writable) session.stream.write(data)
  }

  resize(tabId: string, cols: number, rows: number): void {
    const session = this.sessions.get(tabId)
    session?.stream?.setWindow(rows, cols, 480, 640)
  }

  /** 获取 (惰性创建) SFTP 通道 */
  getSftp(tabId: string): Promise<import('ssh2').SFTPWrapper> {
    const session = this.sessions.get(tabId)
    if (!session) return Promise.reject(new Error('SSH 会话不存在'))
    if (session.sftp) return Promise.resolve(session.sftp)
    return new Promise((resolve, reject) => {
      session.conn.sftp((err, sftp) => {
        if (err) return reject(err)
        session.sftp = sftp
        resolve(sftp)
      })
    })
  }

  /** 执行单条命令并返回 stdout (用于资源监控) */
  exec(tabId: string, command: string): Promise<string> {
    const session = this.sessions.get(tabId)
    if (!session) return Promise.reject(new Error('SSH 会话不存在'))
    return new Promise((resolve, reject) => {
      session.conn.exec(command, (err, stream) => {
        if (err) return reject(err)
        let out = ''
        stream.on('data', (chunk: Buffer) => (out += chunk.toString('utf-8')))
        stream.stderr.on('data', (chunk: Buffer) => (out += chunk.toString('utf-8')))
        stream.on('close', () => resolve(out.trim()))
      })
    })
  }

  isReady(tabId: string): boolean {
    return this.sessions.get(tabId)?.ready ?? false
  }

  close(tabId: string): void {
    const session = this.sessions.get(tabId)
    if (!session) return
    try {
      session.stream?.close()
    } catch {
      /* ignore */
    }
    try {
      session.sftp?.end()
    } catch {
      /* ignore */
    }
    try {
      session.conn.end()
    } catch {
      /* ignore */
    }
    this.cleanup(tabId)
  }

  private cleanup(tabId: string): void {
    const session = this.sessions.get(tabId)
    if (!session) return
    session.ready = false
    this.sessions.delete(tabId)
  }

  private emitError(tabId: string, err: Error): void {
    console.error(`[SshManager] session ${tabId} error:`, err.message)
  }

  get allSessionIds(): string[] {
    return Array.from(this.sessions.keys())
  }
}

export const sshManager = new SshManager()
