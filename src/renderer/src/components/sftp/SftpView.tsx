import { useEffect, useState, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowUp,
  faRotateRight,
  faFolderPlus,
  faFolder,
  faFileLines,
  faFile,
  faDownload,
  faTrash,
  faLightbulb
} from '@fortawesome/free-solid-svg-icons'
import type { SftpEntry } from '@shared/types'
import EditorPane from './EditorPane'

interface Props {
  tabId: string
  credentialId: string
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function EntryIcon({ entry }: { entry: SftpEntry }) {
  if (entry.type === 'directory') return <FontAwesomeIcon icon={faFolder} className="text-amber-400 w-3.5" />
  if (entry.type === 'symlink') return <FontAwesomeIcon icon={faFile} className="text-cyan-400 w-3.5" />
  if (/\.(txt|log|conf|json|yaml|yml|md|sh|py|js|ts|go|rs|c|cpp|java|html|css|xml|ini|toml|env)$/.test(entry.name))
    return <FontAwesomeIcon icon={faFileLines} className="text-blue-400 w-3.5" />
  return <FontAwesomeIcon icon={faFile} className="text-text-muted w-3.5" />
}

export default function SftpView({ tabId, credentialId }: Props) {
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<SftpEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ path: string; name: string } | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true)
    setError('')
    setSelected(null)
    try {
      const list = await window.quickssh.sftp.list(tabId, dir)
      setEntries(list)
      setPath(dir)
    } catch (e) {
      setError((e as Error).message)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [tabId])

  useEffect(() => {
    // 先建立 SSH 连接 (仅连接不开 shell)，再加载家目录
    let alive = true
    setLoading(true)
    window.quickssh.ssh
      .ensureConnected(tabId, credentialId)
      .then(() => {
        if (!alive) return
        setConnected(true)
        return window.quickssh.sftp.stat(tabId, '.')
      })
      .then((s) => {
        if (!alive || !s) return
        void loadDir(s.path || '/root')
      })
      .catch(() => {
        if (alive) void loadDir('/')
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 关闭标签时断开 SSH 连接
  useEffect(() => {
    return () => {
      window.quickssh.ssh.close(tabId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goUp = () => {
    if (path === '/' || !path) return
    const parts = path.split('/').filter(Boolean)
    parts.pop()
    void loadDir(parts.length ? '/' + parts.join('/') : '/')
  }

  const openEntry = (entry: SftpEntry) => {
    if (entry.type === 'directory') {
      void loadDir(entry.path)
    } else {
      setEditing({ path: entry.path, name: entry.name })
    }
  }

  // 拖拽上传：本地文件拖入
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      setUploading(file.name)
      try {
        // file.path 在 Electron 中可用
        const localPath = (file as any).path || file.name
        await window.quickssh.sftp.upload(tabId, localPath, path)
      } catch (err) {
        setError(`上传失败: ${(err as Error).message}`)
      }
    }
    setUploading(null)
    void loadDir(path)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // 下载：双击文件触发 (此处用右键菜单模拟，简化为按钮)
  const downloadSelected = async () => {
    if (!selected) return
    try {
      await window.quickssh.sftp.download(tabId, selected)
    } catch (err) {
      setError(`下载失败: ${(err as Error).message}`)
    }
  }

  const deleteSelected = async () => {
    if (!selected) return
    if (!confirm(`确认删除 ${selected.split('/').pop()} ?`)) return
    try {
      await window.quickssh.sftp.delete(tabId, selected)
      void loadDir(path)
    } catch (err) {
      setError(`删除失败: ${(err as Error).message}`)
    }
  }

  const newFolder = async () => {
    const name = prompt('文件夹名称')
    if (!name) return
    try {
      await window.quickssh.sftp.mkdir(tabId, `${path.replace(/\/$/, '')}/${name}`)
      void loadDir(path)
    } catch (err) {
      setError(`创建失败: ${(err as Error).message}`)
    }
  }

  const breadcrumb = path.split('/').filter(Boolean)

  return (
    <div className="flex h-full w-full flex-col bg-bg" onDrop={onDrop} onDragOver={onDragOver}>
      {/* 工具栏 */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button onClick={goUp} className="rounded px-2 py-1 text-sm hover:bg-surface" title="上级">
          <FontAwesomeIcon icon={faArrowUp} className="w-3" />
        </button>
        <button onClick={() => loadDir(path)} className="rounded px-2 py-1 text-sm hover:bg-surface" title="刷新">
          <FontAwesomeIcon icon={faRotateRight} className="w-3" />
        </button>
        <button onClick={newFolder} className="rounded px-2 py-1 text-sm hover:bg-surface" title="新建文件夹">
          <FontAwesomeIcon icon={faFolderPlus} className="w-3" />
        </button>
        <button
          onClick={downloadSelected}
          disabled={!selected}
          className="rounded px-2 py-1 text-sm hover:bg-surface disabled:opacity-40"
          title="下载"
        >
          <FontAwesomeIcon icon={faDownload} className="w-3 mr-1" />
          下载
        </button>
        <button
          onClick={deleteSelected}
          disabled={!selected}
          className="rounded px-2 py-1 text-sm hover:bg-surface disabled:opacity-40"
          title="删除"
        >
          <FontAwesomeIcon icon={faTrash} className="w-3 mr-1" />
          删除
        </button>
        {/* 路径面包屑 */}
        <div className="ml-2 flex flex-1 items-center gap-0.5 overflow-x-auto text-sm text-text-muted">
          <button onClick={() => loadDir('/')} className="hover:text-accent">/</button>
          {breadcrumb.map((part, i) => {
            const p = '/' + breadcrumb.slice(0, i + 1).join('/')
            return (
              <span key={p} className="flex items-center gap-0.5">
                <button onClick={() => loadDir(p)} className="hover:text-accent">{part}</button>
                <span>/</span>
              </span>
            )
          })}
        </div>
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-text-muted">加载中...</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-400">{error}</div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-sm text-text-muted">空目录 · 将本地文件拖入此区域上传</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-alt text-xs text-text-muted">
              <tr>
                <th className="px-3 py-2 text-left font-normal">名称</th>
                <th className="px-3 py-2 text-right font-normal">大小</th>
                <th className="px-3 py-2 text-right font-normal">权限</th>
                <th className="px-3 py-2 text-right font-normal">修改时间</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isSel = selected === entry.path
                return (
                  <tr
                    key={entry.path}
                    onClick={() => setSelected(entry.path)}
                    onDoubleClick={() => openEntry(entry)}
                    className={`cursor-pointer border-b border-border/50 ${
                      isSel ? 'bg-accent/20' : 'hover:bg-surface'
                    }`}
                  >
                    <td className="px-3 py-1.5">
                      <span className="mr-2 inline-flex items-center">
                        <EntryIcon entry={entry} />
                      </span>
                      <span className={entry.type === 'directory' ? 'font-medium' : ''}>
                        {entry.name}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right text-text-muted">
                      {entry.type === 'directory' ? '-' : fmtSize(entry.size)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-text-muted">
                      {(entry.mode & 0o777).toString(8).padStart(3, '0')}
                    </td>
                    <td className="px-3 py-1.5 text-right text-text-muted">{fmtTime(entry.mtime)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {uploading && (
          <div className="border-t border-border bg-accent/10 px-4 py-2 text-sm text-accent">
            正在上传 {uploading} ...
          </div>
        )}
        <div className="px-4 py-2 text-center text-xs text-text-muted">
          <FontAwesomeIcon icon={faLightbulb} className="w-3 mr-1 text-amber-400" />
          双击文件夹进入 · 双击文本文件内联编辑 · 拖入本地文件上传
        </div>
      </div>

      {/* Monaco 内联编辑器 */}
      {editing && (
        <EditorPane
          tabId={tabId}
          filePath={editing.path}
          fileName={editing.name}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
