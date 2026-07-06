import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faXmark, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { useCredentialsStore } from '../../store/credentials'
import type { HostCredential } from '@shared/types'

interface Props {
  onClose: () => void
}

const empty: HostCredential = {
  id: '',
  name: '',
  host: '',
  port: 22,
  username: 'root',
  group: '',
  authType: 'password',
  password: '',
  privateKey: '',
  passphrase: '',
  createdAt: 0,
  updatedAt: 0
}

export default function CredentialsManager({ onClose }: Props) {
  const credentials = useCredentialsStore((s) => s.credentials)
  const save = useCredentialsStore((s) => s.save)
  const remove = useCredentialsStore((s) => s.remove)
  const [editing, setEditing] = useState<HostCredential | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPassphrase, setShowPassphrase] = useState(false)

  // 已有分组列表，用于输入时自动补全
  const existingGroups = useMemo(() => {
    const set = new Set<string>()
    for (const c of credentials) {
      const g = c.group?.trim()
      if (g) set.add(g)
    }
    return Array.from(set).sort()
  }, [credentials])

  const startNew = () => setEditing({ ...empty, id: `cred-${Date.now()}` })

  const startEdit = (c: HostCredential) => {
    // 编辑时密码字段为空，保留已有则需要重新输入
    setEditing({ ...c, password: '', privateKey: '', passphrase: '' })
  }

  const submit = async () => {
    if (!editing) return
    if (!editing.name || !editing.host || !editing.username) return
    setSaving(true)
    // 如果编辑已有且密码为空，保留旧密码 - 此处简化：为空则不更新
    // 由于主进程 save 会整体覆盖，空密码会覆盖旧密码
    // 改为：若为空则从现有凭据取回
    const existing = credentials.find((c) => c.id === editing.id)
    const toSave = { ...editing }
    if (existing) {
      if (!toSave.password && !toSave.privateKey) {
        // 未修改认证信息，从主进程获取完整凭据
        const full = await window.quickssh.credentials.get(editing.id)
        if (full) {
          toSave.password = full.password
          toSave.privateKey = full.privateKey
          toSave.passphrase = full.passphrase
        }
      }
    }
    await save(toSave)
    setSaving(false)
    setEditing(null)
  }

  const del = async (id: string) => {
    if (!confirm('确认删除此主机凭据？')) return
    await remove(id)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[640px] max-w-[90vw] flex-col overflow-hidden rounded-lg border border-border bg-bg-alt shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FontAwesomeIcon icon={faKey} className="w-3.5 text-amber-400" />
            凭据保险箱
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={startNew}
              className="rounded bg-accent px-3 py-1 text-xs text-white hover:bg-accent-hover"
            >
              + 新增主机
            </button>
            <button onClick={onClose} className="rounded px-2 py-1 text-sm hover:bg-surface">
              <FontAwesomeIcon icon={faXmark} className="w-3" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!editing ? (
            credentials.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-muted">
                暂无主机凭据，点击「新增主机」添加
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {credentials.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded border border-border bg-surface/50 px-4 py-2.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.name}</span>
                        {c.group && (
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
                            {c.group}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted">
                        {c.username}@{c.host}:{c.port} · {c.authType === 'password' ? '密码' : '密钥'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="rounded px-2 py-1 text-xs hover:bg-border"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => del(c.id)}
                        className="rounded px-2 py-1 text-xs text-red-400 hover:bg-border"
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="名称">
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="如：生产服务器"
                    className="input"
                  />
                </Field>
                <Field label="分组">
                  <input
                    value={editing.group ?? ''}
                    onChange={(e) => setEditing({ ...editing, group: e.target.value })}
                    placeholder="如：生产环境"
                    list="cred-groups"
                    className="input"
                  />
                </Field>
              </div>
              <datalist id="cred-groups">
                {existingGroups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <div className="grid grid-cols-3 gap-3">
                <Field label="主机">
                  <input
                    value={editing.host}
                    onChange={(e) => setEditing({ ...editing, host: e.target.value })}
                    placeholder="192.168.1.1"
                    className="input col-span-2"
                  />
                </Field>
                <Field label="端口">
                  <input
                    type="number"
                    value={editing.port}
                    onChange={(e) => setEditing({ ...editing, port: parseInt(e.target.value) || 22 })}
                    className="input"
                  />
                </Field>
              </div>
              <Field label="用户名">
                <input
                  value={editing.username}
                  onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="认证方式">
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      checked={editing.authType === 'password'}
                      onChange={() => setEditing({ ...editing, authType: 'password' })}
                    />
                    密码
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      checked={editing.authType === 'privateKey'}
                      onChange={() => setEditing({ ...editing, authType: 'privateKey' })}
                    />
                    私钥
                  </label>
                </div>
              </Field>
              {editing.authType === 'password' ? (
                <Field label="密码">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={editing.password}
                      onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                      placeholder={credentials.find((c) => c.id === editing.id) ? '留空则不修改' : '输入密码'}
                      className="input pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                      tabIndex={-1}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-3.5" />
                    </button>
                  </div>
                </Field>
              ) : (
                <>
                  <Field label="私钥内容">
                    <textarea
                      value={editing.privateKey}
                      onChange={(e) => setEditing({ ...editing, privateKey: e.target.value })}
                      placeholder={credentials.find((c) => c.id === editing.id) ? '留空则不修改' : '粘贴 -----BEGIN ... 私钥'}
                      rows={4}
                      className="input font-mono text-xs"
                    />
                  </Field>
                  <Field label="密钥口令 (可选)">
                    <div className="relative">
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={editing.passphrase}
                        onChange={(e) => setEditing({ ...editing, passphrase: e.target.value })}
                        className="input pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassphrase((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                        tabIndex={-1}
                      >
                        <FontAwesomeIcon icon={showPassphrase ? faEyeSlash : faEye} className="w-3.5" />
                      </button>
                    </div>
                  </Field>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="rounded px-3 py-1.5 text-sm hover:bg-surface"
                >
                  取消
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="rounded bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .input {
          width: 100%;
          background: rgb(var(--color-bg));
          border: 1px solid rgb(var(--color-border));
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 13px;
          color: rgb(var(--color-text));
          outline: none;
        }
        .input:focus { border-color: rgb(var(--color-accent)); }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </label>
  )
}
