import { app, BrowserWindow, globalShortcut } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow, getMainWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { IpcChannel } from '@shared/ipc-channels'

// node-pty 在打包环境需要作为外部依赖
// ssh2 同样是原生模块

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.quickssh.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createMainWindow()

  // 全局快捷键: Ctrl+Shift+P / Cmd+Shift+P 呼出命令面板
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    getMainWindow()?.webContents.send('global:command-palette')
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})

// 清理 SSH 会话
app.on('before-quit', () => {
  // 各 manager 在进程退出时自动回收
})

export { IpcChannel }
