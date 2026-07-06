import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFilePen, faXmark } from '@fortawesome/free-solid-svg-icons'
import Editor from '@monaco-editor/react'
import { useThemeStore } from '../../store/theme'

interface Props {
  tabId: string
  filePath: string
  fileName: string
  onClose: () => void
}

function detectLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
    json: 'json', html: 'html', css: 'css', md: 'markdown',
    py: 'python', go: 'go', rs: 'rust', java: 'java', c: 'c', cpp: 'cpp',
    sh: 'shell', yml: 'yaml', yaml: 'yaml', xml: 'xml', sql: 'sql', ini: 'ini',
    toml: 'ini', conf: 'ini', env: 'ini'
  }
  return map[ext || ''] || 'plaintext'
}

/** Monaco 内联编辑器 - 双击远端文本文件即可编辑，保存后台同步 */
export default function EditorPane({ tabId, filePath, fileName, onClose }: Props) {
  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'modified' | 'saved' | 'error'>('idle')
  const activeTheme = useThemeStore((s) => s.activeTheme)

  useEffect(() => {
    let alive = true
    setLoading(true)
    window.quickssh.sftp
      .readFile(tabId, filePath)
      .then((text) => {
        if (!alive) return
        setContent(text)
        setOriginal(text)
        setStatus('idle')
      })
      .catch((e) => {
        if (alive) {
          setStatus('error')
          setContent(`// 读取失败: ${e.message}`)
        }
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [tabId, filePath])

  const save = async () => {
    setSaving(true)
    try {
      await window.quickssh.sftp.writeFile(tabId, filePath, content)
      setOriginal(content)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } catch (e) {
      setStatus('error')
      alert(`保存失败: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const onChange = (val: string | undefined) => {
    const v = val ?? ''
    setContent(v)
    setStatus(v === original ? 'idle' : 'modified')
  }

  // Ctrl+S 保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (status === 'modified') void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const monacoTheme = activeTheme?.isDark ? 'vs-dark' : 'vs'

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-bg">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <FontAwesomeIcon icon={faFilePen} className="w-3.5 text-text-muted" />
          <span className="font-medium">{fileName}</span>
          <span className="text-xs text-text-muted">{filePath}</span>
          {status === 'modified' && <span className="text-xs text-yellow-400">● 已修改</span>}
          {status === 'saved' && <span className="text-xs text-green-400">✓ 已保存</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving || status !== 'modified'}
            className="rounded bg-accent px-3 py-1 text-sm text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {saving ? '保存中...' : '保存 (Ctrl+S)'}
          </button>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm hover:bg-surface">
            <FontAwesomeIcon icon={faXmark} className="w-3 mr-1" />
            关闭
          </button>
        </div>
      </div>
      <div className="flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            加载中...
          </div>
        ) : (
          <Editor
            height="100%"
            language={detectLanguage(fileName)}
            value={content}
            theme={monacoTheme}
            onChange={onChange}
            options={{
              fontSize: 14,
              fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: 'on'
            }}
          />
        )}
      </div>
    </div>
  )
}
