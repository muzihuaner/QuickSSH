import type { CustomCommand, CommandHistoryEntry } from '@shared/types'
import { JsonStore } from './json-store'

interface CommandStoreData {
  commands: CustomCommand[]
  history: CommandHistoryEntry[]
  historySeq: number
}

export class CommandStore {
  private store = new JsonStore<CommandStoreData>('commands.json')

  private load(): CommandStoreData {
    return this.store.read() ?? { commands: [], history: [], historySeq: 0 }
  }

  listCommands(): CustomCommand[] {
    return this.load().commands
  }

  saveCommand(cmd: CustomCommand): CustomCommand {
    const data = this.load()
    const idx = data.commands.findIndex((c) => c.id === cmd.id)
    if (idx >= 0) data.commands[idx] = cmd
    else data.commands.push(cmd)
    this.store.write(data)
    return cmd
  }

  deleteCommand(id: string): void {
    const data = this.load()
    data.commands = data.commands.filter((c) => c.id !== id)
    this.store.write(data)
  }

  listHistory(credentialId?: string): CommandHistoryEntry[] {
    const all = this.load().history
    return credentialId ? all.filter((h) => h.credentialId === credentialId) : all
  }

  addHistory(command: string, credentialId?: string): void {
    const data = this.load()
    data.historySeq += 1
    data.history.push({
      id: `h${data.historySeq}`,
      command,
      credentialId,
      ts: Date.now()
    })
    if (data.history.length > 500) data.history = data.history.slice(-500)
    this.store.write(data)
  }

  clearHistory(): void {
    const data = this.load()
    data.history = []
    data.historySeq = 0
    this.store.write(data)
  }
}

export const commandStore = new CommandStore()
