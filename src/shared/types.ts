// QuickSSH 共享类型定义 - 主进程与渲染进程共用

export interface HostCredential {
  id: string
  name: string
  host: string
  port: number
  username: string
  group?: string
  authType: 'password' | 'privateKey'
  password?: string
  privateKey?: string
  passphrase?: string
  createdAt: number
  updatedAt: number
}

export type TabKind = 'ssh' | 'local' | 'sftp'

export interface TabDescriptor {
  id: string
  kind: TabKind
  title: string
  credentialId?: string
  cwd?: string
}

export interface SftpEntry {
  name: string
  longname: string
  type: 'file' | 'directory' | 'symlink' | 'other'
  size: number
  mode: number
  mtime: number
  atime: number
  uid: number
  gid: number
  path: string
}

export interface SftpStat {
  path: string
  size: number
  mode: number
  mtime: number
  isDirectory: boolean
}

export interface MonitorSample {
  ts: number
  cpuPercent: number
  memUsedMB: number
  memTotalMB: number
  netRxKBps: number
  netTxKBps: number
  diskReadKBps: number
  diskWriteKBps: number
}

export interface CustomCommand {
  id: string
  name: string
  command: string
  credentialId?: string
}

export interface CommandHistoryEntry {
  id: string
  command: string
  credentialId?: string
  ts: number
}

export interface ThemeColors {
  bg: string
  bgAlt: string
  surface: string
  border: string
  text: string
  textMuted: string
  accent: string
  accentHover: string
}

export interface ThemeDefinition {
  id: string
  name: string
  isDark: boolean
  colors: ThemeColors
  terminal: {
    background: string
    foreground: string
    cursor: string
    selection: string
    ansi: string[]
  }
}

export interface LocalTerminalOptions {
  cwd?: string
  shell?: string
}

export interface SshConnectOptions {
  credentialId: string
  cols: number
  rows: number
}
