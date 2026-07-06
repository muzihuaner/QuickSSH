import type { MonitorSample } from '@shared/types'
import { sshManager } from './manager'

/**
 * 主机资源监控 - 通过已有 SSH 连接执行 shell 命令采样
 * 无需远端安装任何代理，利用 /proc 与系统工具
 */
export class HostMonitor {
  private timers = new Map<string, NodeJS.Timeout>()
  private prevNet: { rx: number; tx: number } | null = null
  private prevDisk: { read: number; write: number } | null = null
  private prevCpu: { idle: number; total: number } | null = null

  start(tabId: string, intervalMs: number, onSample: (s: MonitorSample) => void): void {
    this.stop(tabId)
    this.resetState()
    const tick = async () => {
      try {
        const sample = await this.sample(tabId)
        onSample(sample)
      } catch (e) {
        // 连接断开等错误，静默处理
        console.error('[Monitor] sample failed', (e as Error).message)
      }
    }
    void tick()
    const timer = setInterval(() => void tick(), intervalMs)
    this.timers.set(tabId, timer)
  }

  stop(tabId: string): void {
    const timer = this.timers.get(tabId)
    if (timer) {
      clearInterval(timer)
      this.timers.delete(tabId)
    }
    this.resetState()
  }

  private resetState(): void {
    this.prevNet = null
    this.prevDisk = null
    this.prevCpu = null
  }

  private async sample(tabId: string): Promise<MonitorSample> {
    // 并行执行多条采样命令
    const [cpuStr, memStr, netStr, diskStr] = await Promise.all([
      sshManager.exec(tabId, 'cat /proc/stat | head -n 1'),
      sshManager.exec(tabId, 'cat /proc/meminfo | head -n 2'),
      sshManager.exec(tabId, 'cat /proc/net/dev | tail -n +3'),
      sshManager.exec(tabId, 'cat /proc/diskstats | grep -E "vda|sda|nvme0" | head -n 1')
    ])

    const cpuPercent = this.parseCpu(cpuStr)
    const { memUsedMB, memTotalMB } = this.parseMem(memStr)
    const { netRxKBps, netTxKBps } = this.parseNet(netStr)
    const { diskReadKBps, diskWriteKBps } = this.parseDisk(diskStr)

    return {
      ts: Date.now(),
      cpuPercent,
      memUsedMB,
      memTotalMB,
      netRxKBps,
      netTxKBps,
      diskReadKBps,
      diskWriteKBps
    }
  }

  private parseCpu(line: string): number {
    const parts = line.trim().split(/\s+/)
    // user nice system idle iowait irq softirq steal ...
    const values = parts.slice(1).map(Number)
    if (values.length < 4) return 0
    const idle = values[3] + (values[4] || 0)
    const total = values.reduce((a, b) => a + b, 0)
    if (this.prevCpu) {
      const dTotal = total - this.prevCpu.total
      const dIdle = idle - this.prevCpu.idle
      this.prevCpu = { idle, total }
      if (dTotal <= 0) return 0
      return Math.max(0, Math.min(100, ((dTotal - dIdle) / dTotal) * 100))
    }
    this.prevCpu = { idle, total }
    return 0
  }

  private parseMem(text: string): { memUsedMB: number; memTotalMB: number } {
    const totalMatch = text.match(/MemTotal:\s+(\d+)/)
    const freeMatch = text.match(/MemAvailable:\s+(\d+)/) || text.match(/MemFree:\s+(\d+)/)
    const totalKB = totalMatch ? parseInt(totalMatch[1], 10) : 0
    const availKB = freeMatch ? parseInt(freeMatch[1], 10) : 0
    return {
      memTotalMB: Math.round(totalKB / 1024),
      memUsedMB: Math.round((totalKB - availKB) / 1024)
    }
  }

  private parseNet(text: string): { netRxKBps: number; netTxKBps: number } {
    let rx = 0
    let tx = 0
    for (const line of text.trim().split('\n')) {
      const parts = line.trim().split(/:\s*/)
      if (parts.length < 2) continue
      const data = parts[1].trim().split(/\s+/).map(Number)
      if (data.length < 9) continue
      // 跳过 lo 回环
      const iface = parts[0].trim()
      if (iface === 'lo') continue
      rx += data[0]
      tx += data[8]
    }
    if (this.prevNet) {
      const dRx = (rx - this.prevNet.rx) / 1024
      const dTx = (tx - this.prevNet.tx) / 1024
      this.prevNet = { rx, tx }
      return { netRxKBps: Math.max(0, dRx), netTxKBps: Math.max(0, dTx) }
    }
    this.prevNet = { rx, tx }
    return { netRxKBps: 0, netTxKBps: 0 }
  }

  private parseDisk(line: string): { diskReadKBps: number; diskWriteKBps: number } {
    if (!line) return { diskReadKBps: 0, diskWriteKBps: 0 }
    // /proc/diskstats 字段: major minor name reads_completed reads_merged sectors_read time_reading ...
    // sectors_read = idx 5 (0-based from name? 标准: 字段3=reads, 5=sectors_read, 7=sectors_written after name)
    const parts = line.trim().split(/\s+/)
    // 标准布局: [0=major][1=minor][2=name][3=reads][4=rmerged][5=rsectors][6=rtime][7=writes][8=wmerged][9=wsectors][10=wtime]...
    const sectorsRead = parseInt(parts[5] || '0', 10)
    const sectorsWritten = parseInt(parts[9] || '0', 10)
    if (this.prevDisk) {
      const dRead = ((sectorsRead - this.prevDisk.read) * 512) / 1024 // bytes -> KB
      const dWrite = ((sectorsWritten - this.prevDisk.write) * 512) / 1024
      this.prevDisk = { read: sectorsRead, write: sectorsWritten }
      return { diskReadKBps: Math.max(0, dRead), diskWriteKBps: Math.max(0, dWrite) }
    }
    this.prevDisk = { read: sectorsRead, write: sectorsWritten }
    return { diskReadKBps: 0, diskWriteKBps: 0 }
  }
}

export const hostMonitor = new HostMonitor()
