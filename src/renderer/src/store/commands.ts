import { create } from 'zustand'
import type { CustomCommand, CommandHistoryEntry } from '@shared/types'

interface CommandsState {
  commands: CustomCommand[]
  history: CommandHistoryEntry[]
  load: () => Promise<void>
  saveCommand: (cmd: CustomCommand) => Promise<void>
  deleteCommand: (id: string) => Promise<void>
  addHistory: (command: string, credentialId?: string) => Promise<void>
  clearHistory: () => Promise<void>
}

export const useCommandsStore = create<CommandsState>((set, get) => ({
  commands: [],
  history: [],
  load: async () => {
    const [cmds, hist] = await Promise.all([
      window.quickssh.commands.list(),
      window.quickssh.commands.listHistory()
    ])
    set({ commands: cmds, history: hist })
  },
  saveCommand: async (cmd) => {
    await window.quickssh.commands.save(cmd)
    await get().load()
  },
  deleteCommand: async (id) => {
    await window.quickssh.commands.delete(id)
    await get().load()
  },
  addHistory: async (command, credentialId) => {
    await window.quickssh.commands.addHistory(command, credentialId)
    await get().load()
  },
  clearHistory: async () => {
    await window.quickssh.commands.clearHistory()
    await get().load()
  }
}))
