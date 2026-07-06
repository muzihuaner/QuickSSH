import { safeStorage } from 'electron'
import type { HostCredential } from '@shared/types'
import { JsonStore } from './json-store'

interface CredentialStoreData {
  credentials: HostCredential[]
}

/**
 * 凭据保险箱 - 使用 Electron safeStorage (基于系统密钥链) 加密敏感字段
 * 明文元数据(名称/主机/端口/用户名)直接存储，密码与私钥加密存储
 */
export class CredentialVault {
  private store = new JsonStore<CredentialStoreData>('credentials.json')

  list(): HostCredential[] {
    const data = this.store.read()
    if (!data) return []
    return data.credentials.map((c) => this.decrypt(c))
  }

  get(id: string): HostCredential | null {
    return this.list().find((c) => c.id === id) ?? null
  }

  save(cred: HostCredential): HostCredential {
    const all = this.list()
    const idx = all.findIndex((c) => c.id === cred.id)
    const now = Date.now()
    const next = { ...cred, updatedAt: now, createdAt: cred.createdAt || now }
    if (idx >= 0) all[idx] = next
    else all.push(next)
    this.persist(all)
    return next
  }

  delete(id: string): void {
    const all = this.list().filter((c) => c.id !== id)
    this.persist(all)
  }

  private persist(all: HostCredential[]): void {
    this.store.write({ credentials: all.map((c) => this.encrypt(c)) })
  }

  private encrypt(c: HostCredential): HostCredential {
    const out = { ...c }
    if (out.password) out.password = this.encryptStr(out.password)
    if (out.privateKey) out.privateKey = this.encryptStr(out.privateKey)
    if (out.passphrase) out.passphrase = this.encryptStr(out.passphrase)
    return out
  }

  private decrypt(c: HostCredential): HostCredential {
    const out = { ...c }
    if (out.password) out.password = this.decryptStr(out.password)
    if (out.privateKey) out.privateKey = this.decryptStr(out.privateKey)
    if (out.passphrase) out.passphrase = this.decryptStr(out.passphrase)
    return out
  }

  private encryptStr(plain: string): string {
    if (!safeStorage.isEncryptionAvailable()) return `plain:${plain}`
    return `enc:${safeStorage.encryptString(plain).toString('base64')}`
  }

  private decryptStr(stored: string): string {
    if (stored.startsWith('enc:')) {
      try {
        return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'))
      } catch {
        return ''
      }
    }
    if (stored.startsWith('plain:')) return stored.slice(6)
    return stored
  }
}

export const credentialVault = new CredentialVault()
