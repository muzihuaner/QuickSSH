import type { Stats } from 'ssh2'
import type { SftpEntry, SftpStat } from '@shared/types'
import { sshManager } from './manager'
import { createReadStream, createWriteStream, statSync } from 'fs'
import { basename } from 'path'

function toEntry(remotePath: string, s: Stats): SftpEntry {
  let type: SftpEntry['type'] = 'other'
  if (s.isDirectory()) type = 'directory'
  else if (s.isFile()) type = 'file'
  else if (s.isSymbolicLink()) type = 'symlink'
  return {
    name: basename(remotePath),
    longname: '',
    type,
    size: s.size,
    mode: s.mode,
    mtime: s.mtime * 1000,
    atime: s.atime * 1000,
    uid: s.uid,
    gid: s.gid,
    path: remotePath
  }
}

/** SFTP 操作 - 基于 SSH 连接复用 SFTP 通道 */
export const sftpOps = {
  async list(tabId: string, remotePath: string): Promise<SftpEntry[]> {
    const sftp = await sshManager.getSftp(tabId)
    return new Promise((resolve, reject) => {
      sftp.readdir(remotePath, (err, list) => {
        if (err) return reject(err)
        const entries: SftpEntry[] = list.map((item) => {
          const s = item.attrs
          let type: SftpEntry['type'] = 'other'
          if (s.isDirectory()) type = 'directory'
          else if (s.isFile()) type = 'file'
          else if (s.isSymbolicLink()) type = 'symlink'
          return {
            name: item.filename,
            longname: item.longname,
            type,
            size: s.size,
            mode: s.mode,
            mtime: s.mtime * 1000,
            atime: s.atime * 1000,
            uid: s.uid,
            gid: s.gid,
            path: remotePath.endsWith('/') ? `${remotePath}${item.filename}` : `${remotePath}/${item.filename}`
          }
        })
        entries.sort((a, b) => {
          if (a.type === 'directory' && b.type !== 'directory') return -1
          if (a.type !== 'directory' && b.type === 'directory') return 1
          return a.name.localeCompare(b.name)
        })
        resolve(entries)
      })
    })
  },

  async stat(tabId: string, remotePath: string): Promise<SftpStat> {
    const sftp = await sshManager.getSftp(tabId)
    return new Promise((resolve, reject) => {
      sftp.stat(remotePath, (err, s) => {
        if (err) return reject(err)
        resolve({
          path: remotePath,
          size: s.size,
          mode: s.mode,
          mtime: s.mtime * 1000,
          isDirectory: s.isDirectory()
        })
      })
    })
  },

  async readFile(tabId: string, remotePath: string): Promise<string> {
    const sftp = await sshManager.getSftp(tabId)
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const stream = sftp.createReadStream(remotePath, { encoding: 'utf-8' })
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
      stream.on('error', reject)
    })
  },

  async writeFile(tabId: string, remotePath: string, content: string): Promise<void> {
    const sftp = await sshManager.getSftp(tabId)
    return new Promise((resolve, reject) => {
      const stream = sftp.createWriteStream(remotePath, { encoding: 'utf-8' })
      stream.on('close', () => resolve())
      stream.on('error', reject)
      stream.end(content, 'utf-8')
    })
  },

  async mkdir(tabId: string, remotePath: string): Promise<void> {
    const sftp = await sshManager.getSftp(tabId)
    return new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, (err) => (err ? reject(err) : resolve()))
    })
  },

  async delete(tabId: string, remotePath: string): Promise<void> {
    const sftp = await sshManager.getSftp(tabId)
    const stat = await this.stat(tabId, remotePath)
    return new Promise((resolve, reject) => {
      if (stat.isDirectory) {
        sftp.rmdir(remotePath, (err) => (err ? reject(err) : resolve()))
      } else {
        sftp.unlink(remotePath, (err) => (err ? reject(err) : resolve()))
      }
    })
  },

  async rename(tabId: string, oldPath: string, newPath: string): Promise<void> {
    const sftp = await sshManager.getSftp(tabId)
    return new Promise((resolve, reject) => {
      sftp.rename(oldPath, newPath, (err) => (err ? reject(err) : resolve()))
    })
  },

  async chmod(tabId: string, remotePath: string, mode: number): Promise<void> {
    const sftp = await sshManager.getSftp(tabId)
    return new Promise((resolve, reject) => {
      sftp.chmod(remotePath, mode, (err) => (err ? reject(err) : resolve()))
    })
  },

  /** 下载远端文件到本地，报告进度 */
  async download(
    tabId: string,
    remotePath: string,
    localPath: string,
    onProgress?: (received: number, total: number) => void
  ): Promise<void> {
    const sftp = await sshManager.getSftp(tabId)
    const stat = await this.stat(tabId, remotePath)
    if (stat.isDirectory) throw new Error('不支持下载目录')
    return new Promise((resolve, reject) => {
      const rs = sftp.createReadStream(remotePath)
      const ws = createWriteStream(localPath)
      let received = 0
      const total = stat.size
      rs.on('data', (chunk: Buffer) => {
        received += chunk.length
        onProgress?.(received, total)
      })
      rs.on('error', reject)
      ws.on('error', reject)
      ws.on('close', () => resolve())
      rs.pipe(ws)
    })
  },

  /** 上传本地文件到远端，报告进度 */
  async upload(
    tabId: string,
    localPath: string,
    remotePath: string,
    onProgress?: (sent: number, total: number) => void
  ): Promise<void> {
    const sftp = await sshManager.getSftp(tabId)
    const total = statSync(localPath).size
    return new Promise((resolve, reject) => {
      const rs = createReadStream(localPath)
      const ws = sftp.createWriteStream(remotePath)
      let sent = 0
      rs.on('data', (chunk: string | Buffer) => {
        sent += chunk.length
        onProgress?.(sent, total)
      })
      rs.on('error', reject)
      ws.on('error', reject)
      ws.on('close', () => resolve())
      rs.pipe(ws)
    })
  },

  /** 解析远端家目录 */
  async home(tabId: string): Promise<string> {
    const out = await sshManager.exec(tabId, 'echo $HOME')
    return out || '/root'
  }
}

export { toEntry }
