import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

/** 通用 JSON 持久化存储，文件位于 userData 目录下 */
export class JsonStore<T> {
  private filePath: string

  constructor(fileName: string) {
    const dir = join(app.getPath('userData'), 'data')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.filePath = join(dir, fileName)
  }

  read(): T | null {
    try {
      if (!existsSync(this.filePath)) return null
      const raw = readFileSync(this.filePath, 'utf-8')
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  write(data: T): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {
      console.error('[JsonStore] write failed', e)
    }
  }
}
