import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { IpcChannel } from '@shared/ipc-channels'
import type {
  HostCredential,
  CustomCommand,
  SftpEntry,
  SftpStat,
  MonitorSample,
  ThemeDefinition,
  LocalTerminalOptions
} from '@shared/types'

const api = {
  // ===== SSH 会话 =====
  ssh: {
    connect: (tabId: string, credentialId: string, cols: number, rows: number) =>
      ipcRenderer.invoke(IpcChannel.SSH_CONNECT, { tabId, credentialId, cols, rows }),
    ensureConnected: (tabId: string, credentialId: string) =>
      ipcRenderer.invoke(IpcChannel.SSH_ENSURE_CONNECTED, { tabId, credentialId }),
    input: (tabId: string, data: string) => ipcRenderer.send(IpcChannel.SSH_INPUT, { tabId, data }),
    resize: (tabId: string, cols: number, rows: number) =>
      ipcRenderer.send(IpcChannel.SSH_RESIZE, { tabId, cols, rows }),
    close: (tabId: string) => ipcRenderer.send(IpcChannel.SSH_CLOSE, tabId),
    onData: (cb: (tabId: string, data: string) => void) => {
      const handler = (_e: IpcRendererEvent, args: { tabId: string; data: string }) =>
        cb(args.tabId, args.data)
      ipcRenderer.on(IpcChannel.SSH_DATA, handler)
      return () => ipcRenderer.off(IpcChannel.SSH_DATA, handler)
    },
    onClosed: (cb: (tabId: string) => void) => {
      const handler = (_e: IpcRendererEvent, args: { tabId: string }) => cb(args.tabId)
      ipcRenderer.on(IpcChannel.SSH_CLOSED, handler)
      return () => ipcRenderer.off(IpcChannel.SSH_CLOSED, handler)
    }
  },

  // ===== SFTP =====
  sftp: {
    list: (tabId: string, path: string): Promise<SftpEntry[]> =>
      ipcRenderer.invoke(IpcChannel.SFTP_LIST, { tabId, path }),
    stat: (tabId: string, path: string): Promise<SftpStat> =>
      ipcRenderer.invoke(IpcChannel.SFTP_STAT, { tabId, path }),
    readFile: (tabId: string, path: string): Promise<string> =>
      ipcRenderer.invoke(IpcChannel.SFTP_READ_FILE, { tabId, path }),
    writeFile: (tabId: string, path: string, content: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannel.SFTP_WRITE_FILE, { tabId, path, content }),
    mkdir: (tabId: string, path: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannel.SFTP_MKDIR, { tabId, path }),
    delete: (tabId: string, path: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannel.SFTP_DELETE, { tabId, path }),
    rename: (tabId: string, oldPath: string, newPath: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannel.SFTP_RENAME, { tabId, oldPath, newPath }),
    chmod: (tabId: string, path: string, mode: number): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannel.SFTP_CHMOD, { tabId, path, mode }),
    download: (tabId: string, remotePath: string) =>
      ipcRenderer.invoke(IpcChannel.SFTP_DOWNLOAD, { tabId, remotePath }),
    upload: (tabId: string, localPath: string, remoteDir: string) =>
      ipcRenderer.invoke(IpcChannel.SFTP_UPLOAD, { tabId, localPath, remoteDir }),
    onProgress: (cb: (info: { remotePath: string; received?: number; sent?: number; total: number }) => void) => {
      const handler = (_e: IpcRendererEvent, args: any) => cb(args)
      ipcRenderer.on(IpcChannel.SFTP_PROGRESS, handler)
      return () => ipcRenderer.off(IpcChannel.SFTP_PROGRESS, handler)
    }
  },

  // ===== 资源监控 =====
  monitor: {
    start: (tabId: string, intervalMs = 2000) =>
      ipcRenderer.send(IpcChannel.MONITOR_START, { tabId, intervalMs }),
    stop: (tabId: string) => ipcRenderer.send(IpcChannel.MONITOR_STOP, tabId),
    onSample: (cb: (tabId: string, sample: MonitorSample) => void) => {
      const handler = (_e: IpcRendererEvent, args: { tabId: string; sample: MonitorSample }) =>
        cb(args.tabId, args.sample)
      ipcRenderer.on(IpcChannel.MONITOR_SAMPLE, handler)
      return () => ipcRenderer.off(IpcChannel.MONITOR_SAMPLE, handler)
    }
  },

  // ===== 本地终端 =====
  local: {
    spawn: (tabId: string, opts: LocalTerminalOptions = {}, cols = 80, rows = 24) =>
      ipcRenderer.invoke(IpcChannel.LOCAL_SPAWN, { tabId, ...opts, cols, rows }),
    input: (tabId: string, data: string) => ipcRenderer.send(IpcChannel.LOCAL_INPUT, { tabId, data }),
    resize: (tabId: string, cols: number, rows: number) =>
      ipcRenderer.send(IpcChannel.LOCAL_RESIZE, { tabId, cols, rows }),
    close: (tabId: string) => ipcRenderer.send(IpcChannel.LOCAL_CLOSE, tabId),
    onData: (cb: (tabId: string, data: string) => void) => {
      const handler = (_e: IpcRendererEvent, args: { tabId: string; data: string }) =>
        cb(args.tabId, args.data)
      ipcRenderer.on(IpcChannel.LOCAL_DATA, handler)
      return () => ipcRenderer.off(IpcChannel.LOCAL_DATA, handler)
    },
    onClosed: (cb: (tabId: string, exitCode: number) => void) => {
      const handler = (_e: IpcRendererEvent, args: { tabId: string; exitCode: number }) =>
        cb(args.tabId, args.exitCode)
      ipcRenderer.on(IpcChannel.LOCAL_CLOSED, handler)
      return () => ipcRenderer.off(IpcChannel.LOCAL_CLOSED, handler)
    }
  },

  // ===== 凭据保险箱 =====
  credentials: {
    list: (): Promise<HostCredential[]> => ipcRenderer.invoke(IpcChannel.CRED_LIST),
    get: (id: string): Promise<HostCredential | null> => ipcRenderer.invoke(IpcChannel.CRED_GET, id),
    save: (cred: HostCredential): Promise<HostCredential> =>
      ipcRenderer.invoke(IpcChannel.CRED_SAVE, cred),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke(IpcChannel.CRED_DELETE, id)
  },

  // ===== 自定义命令与历史 =====
  commands: {
    list: (): Promise<CustomCommand[]> => ipcRenderer.invoke(IpcChannel.CMD_LIST),
    save: (cmd: CustomCommand): Promise<CustomCommand> => ipcRenderer.invoke(IpcChannel.CMD_SAVE, cmd),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke(IpcChannel.CMD_DELETE, id),
    listHistory: (credentialId?: string) => ipcRenderer.invoke(IpcChannel.HISTORY_LIST, credentialId),
    addHistory: (command: string, credentialId?: string) =>
      ipcRenderer.invoke(IpcChannel.HISTORY_ADD, { command, credentialId }),
    clearHistory: (): Promise<boolean> => ipcRenderer.invoke(IpcChannel.HISTORY_CLEAR)
  },

  // ===== 主题 =====
  theme: {
    list: (): Promise<ThemeDefinition[]> => ipcRenderer.invoke(IpcChannel.THEME_LIST),
    get: (id: string): Promise<ThemeDefinition> => ipcRenderer.invoke(IpcChannel.THEME_GET, id)
  },

  // ===== 暂离保护 =====
  lock: {
    request: () => ipcRenderer.send(IpcChannel.APP_LOCK),
    onLocked: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on(IpcChannel.APP_LOCKED, handler)
      return () => ipcRenderer.off(IpcChannel.APP_LOCKED, handler)
    }
  },

  // ===== 窗口控制 =====
  window: {
    minimize: () => ipcRenderer.invoke(IpcChannel.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IpcChannel.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(IpcChannel.WINDOW_CLOSE),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IpcChannel.WINDOW_IS_MAXIMIZED)
  },

  // ===== 全局事件 =====
  onCommandPalette: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('global:command-palette', handler)
    return () => ipcRenderer.off('global:command-palette', handler)
  }
}

export type QuickSshApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('quickssh', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.quickssh = api
}
