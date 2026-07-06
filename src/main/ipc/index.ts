import { ipcMain, BrowserWindow, dialog } from 'electron'
import { IpcChannel } from '@shared/ipc-channels'
import type { HostCredential, CustomCommand, MonitorSample } from '@shared/types'
import { sshManager } from '../ssh/manager'
import { sftpOps } from '../ssh/sftp'
import { hostMonitor } from '../ssh/monitor'
import { localTerminalManager } from '../local-terminal'
import { credentialVault } from '../store/credentials'
import { commandStore } from '../store/commands'
import { builtInThemes, getThemeById } from '../store/themes'

/** 注册全部 IPC 处理器 */
export function registerIpcHandlers(): void {
  // ===== SSH 会话 =====
  ipcMain.handle(
    IpcChannel.SSH_CONNECT,
    async (evt, args: { tabId: string; credentialId: string; cols: number; rows: number }) => {
      const cred = credentialVault.get(args.credentialId)
      if (!cred) throw new Error('凭据不存在')
      const tabId = args.tabId
      const win = BrowserWindow.fromWebContents(evt.sender)
      try {
        await sshManager.connect(tabId, cred)
        await sshManager.openShell(
          tabId,
          args.cols,
          args.rows,
          (data) => {
            win?.webContents.send(IpcChannel.SSH_DATA, { tabId, data })
          },
          () => {
            win?.webContents.send(IpcChannel.SSH_CLOSED, { tabId })
          }
        )
        return { ok: true, tabId }
      } catch (err) {
        // 连接或 shell 打开失败时确保清理
        sshManager.close(tabId)
        throw err
      }
    }
  )

  // 仅为 SFTP 建立 SSH 连接 (不开 shell)
  ipcMain.handle(
    IpcChannel.SSH_ENSURE_CONNECTED,
    async (_evt, args: { tabId: string; credentialId: string }) => {
      if (sshManager.isReady(args.tabId)) return { ok: true }
      const cred = credentialVault.get(args.credentialId)
      if (!cred) throw new Error('凭据不存在')
      await sshManager.connect(args.tabId, cred)
      return { ok: true }
    }
  )

  ipcMain.on(IpcChannel.SSH_INPUT, (_evt, args: { tabId: string; data: string }) => {
    sshManager.write(args.tabId, args.data)
  })

  ipcMain.on(IpcChannel.SSH_RESIZE, (_evt, args: { tabId: string; cols: number; rows: number }) => {
    sshManager.resize(args.tabId, args.cols, args.rows)
  })

  ipcMain.on(IpcChannel.SSH_CLOSE, (_evt, tabId: string) => {
    sshManager.close(tabId)
  })

  // ===== SFTP =====
  ipcMain.handle(IpcChannel.SFTP_LIST, async (_evt, args: { tabId: string; path: string }) => {
    return sftpOps.list(args.tabId, args.path)
  })

  ipcMain.handle(IpcChannel.SFTP_STAT, async (_evt, args: { tabId: string; path: string }) => {
    return sftpOps.stat(args.tabId, args.path)
  })

  ipcMain.handle(IpcChannel.SFTP_READ_FILE, async (_evt, args: { tabId: string; path: string }) => {
    return sftpOps.readFile(args.tabId, args.path)
  })

  ipcMain.handle(IpcChannel.SFTP_WRITE_FILE, async (_evt, args: { tabId: string; path: string; content: string }) => {
    await sftpOps.writeFile(args.tabId, args.path, args.content)
    return true
  })

  ipcMain.handle(IpcChannel.SFTP_MKDIR, async (_evt, args: { tabId: string; path: string }) => {
    await sftpOps.mkdir(args.tabId, args.path)
    return true
  })

  ipcMain.handle(IpcChannel.SFTP_DELETE, async (_evt, args: { tabId: string; path: string }) => {
    await sftpOps.delete(args.tabId, args.path)
    return true
  })

  ipcMain.handle(IpcChannel.SFTP_RENAME, async (_evt, args: { tabId: string; oldPath: string; newPath: string }) => {
    await sftpOps.rename(args.tabId, args.oldPath, args.newPath)
    return true
  })

  ipcMain.handle(IpcChannel.SFTP_CHMOD, async (_evt, args: { tabId: string; path: string; mode: number }) => {
    await sftpOps.chmod(args.tabId, args.path, args.mode)
    return true
  })

  ipcMain.handle(IpcChannel.SFTP_DOWNLOAD, async (evt, args: { tabId: string; remotePath: string }) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: args.remotePath.split('/').pop() || 'download'
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    await sftpOps.download(args.tabId, args.remotePath, result.filePath, (received, total) => {
      win?.webContents.send(IpcChannel.SFTP_PROGRESS, { remotePath: args.remotePath, received, total })
    })
    return { canceled: false, localPath: result.filePath }
  })

  ipcMain.handle(IpcChannel.SFTP_UPLOAD, async (evt, args: { tabId: string; localPath: string; remoteDir: string }) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    const fileName = args.localPath.split(/[/\\]/).pop() || 'upload'
    const remotePath = `${args.remoteDir.replace(/\/$/, '')}/${fileName}`
    await sftpOps.upload(args.tabId, args.localPath, remotePath, (sent, total) => {
      win?.webContents.send(IpcChannel.SFTP_PROGRESS, { remotePath, sent, total })
    })
    return { remotePath }
  })

  // ===== 资源监控 =====
  ipcMain.on(IpcChannel.MONITOR_START, (evt, args: { tabId: string; intervalMs: number }) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    hostMonitor.start(
      args.tabId,
      args.intervalMs,
      (sample: MonitorSample) => {
        win?.webContents.send(IpcChannel.MONITOR_SAMPLE, { tabId: args.tabId, sample })
      }
    )
  })

  ipcMain.on(IpcChannel.MONITOR_STOP, (_evt, tabId: string) => {
    hostMonitor.stop(tabId)
  })

  // ===== 本地终端 =====
  ipcMain.handle(
    IpcChannel.LOCAL_SPAWN,
    (evt, args: { tabId: string; cwd?: string; cols?: number; rows?: number }) => {
      const win = BrowserWindow.fromWebContents(evt.sender)
      localTerminalManager.spawn(
        args.tabId,
        { cwd: args.cwd, cols: args.cols, rows: args.rows },
        (data) => win?.webContents.send(IpcChannel.LOCAL_DATA, { tabId: args.tabId, data }),
        (exitCode) => win?.webContents.send(IpcChannel.LOCAL_CLOSED, { tabId: args.tabId, exitCode })
      )
      return true
    }
  )

  ipcMain.on(IpcChannel.LOCAL_INPUT, (_evt, args: { tabId: string; data: string }) => {
    localTerminalManager.write(args.tabId, args.data)
  })

  ipcMain.on(IpcChannel.LOCAL_RESIZE, (_evt, args: { tabId: string; cols: number; rows: number }) => {
    localTerminalManager.resize(args.tabId, args.cols, args.rows)
  })

  ipcMain.on(IpcChannel.LOCAL_CLOSE, (_evt, tabId: string) => {
    localTerminalManager.close(tabId)
  })

  // ===== 凭据保险箱 =====
  ipcMain.handle(IpcChannel.CRED_LIST, () => credentialVault.list())
  ipcMain.handle(IpcChannel.CRED_GET, (_evt, id: string) => credentialVault.get(id))
  ipcMain.handle(IpcChannel.CRED_SAVE, (_evt, cred: HostCredential) => credentialVault.save(cred))
  ipcMain.handle(IpcChannel.CRED_DELETE, (_evt, id: string) => {
    credentialVault.delete(id)
    return true
  })

  // ===== 自定义命令与历史 =====
  ipcMain.handle(IpcChannel.CMD_LIST, () => commandStore.listCommands())
  ipcMain.handle(IpcChannel.CMD_SAVE, (_evt, cmd: CustomCommand) => commandStore.saveCommand(cmd))
  ipcMain.handle(IpcChannel.CMD_DELETE, (_evt, id: string) => {
    commandStore.deleteCommand(id)
    return true
  })
  ipcMain.handle(IpcChannel.HISTORY_LIST, (_evt, credentialId?: string) =>
    commandStore.listHistory(credentialId)
  )
  ipcMain.handle(IpcChannel.HISTORY_ADD, (_evt, args: { command: string; credentialId?: string }) => {
    commandStore.addHistory(args.command, args.credentialId)
    return true
  })
  ipcMain.handle(IpcChannel.HISTORY_CLEAR, () => {
    commandStore.clearHistory()
    return true
  })

  // ===== 主题 =====
  ipcMain.handle(IpcChannel.THEME_LIST, () => builtInThemes)
  ipcMain.handle(IpcChannel.THEME_GET, (_evt, id: string) => getThemeById(id) ?? builtInThemes[0])

  // ===== 窗口控制 =====
  ipcMain.handle(IpcChannel.WINDOW_MINIMIZE, (evt) => {
    BrowserWindow.fromWebContents(evt.sender)?.minimize()
  })
  ipcMain.handle(IpcChannel.WINDOW_MAXIMIZE, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    if (win?.isMaximized()) win?.unmaximize()
    else win?.maximize()
  })
  ipcMain.handle(IpcChannel.WINDOW_CLOSE, (evt) => {
    BrowserWindow.fromWebContents(evt.sender)?.close()
  })
  ipcMain.handle(IpcChannel.WINDOW_IS_MAXIMIZED, (evt) => {
    return BrowserWindow.fromWebContents(evt.sender)?.isMaximized() ?? false
  })

  // ===== 暂离保护 =====
  // 锁定状态纯前端维护，主进程仅做事件中继
  ipcMain.on(IpcChannel.APP_LOCK, (evt) => {
    BrowserWindow.fromWebContents(evt.sender)?.webContents.send(IpcChannel.APP_LOCKED)
  })
}
