import { create } from 'zustand'
import type { HostCredential } from '@shared/types'

interface CredentialsState {
  credentials: HostCredential[]
  loaded: boolean
  load: () => Promise<void>
  save: (cred: HostCredential) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useCredentialsStore = create<CredentialsState>((set, get) => ({
  credentials: [],
  loaded: false,
  load: async () => {
    const list = await window.quickssh.credentials.list()
    // 脱敏：不在渲染层保留明文密码
    set({
      credentials: list.map((c) => ({ ...c, password: '', privateKey: '', passphrase: '' })),
      loaded: true
    })
  },
  save: async (cred) => {
    await window.quickssh.credentials.save(cred)
    await get().load()
  },
  remove: async (id) => {
    await window.quickssh.credentials.delete(id)
    await get().load()
  }
}))
