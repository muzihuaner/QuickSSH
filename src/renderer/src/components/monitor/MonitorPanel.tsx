import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine, faPlay, faPause, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { MonitorSample } from '@shared/types'
import { useAppStore } from '../../store/app'

interface Props {
  tabId: string
}

const MAX_POINTS = 60

/** 实时主机资源监控 - CPU/内存/网络/磁盘IO 图表 */
export default function MonitorPanel({ tabId }: Props) {
  const [samples, setSamples] = useState<MonitorSample[]>([])
  const [paused, setPaused] = useState(false)
  const setMonitorTabId = useAppStore((s) => s.setMonitorTabId)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    window.quickssh.monitor.start(tabId, 2000)
    const off = window.quickssh.monitor.onSample((tid, sample) => {
      if (tid !== tabId || pausedRef.current) return
      setSamples((prev) => [...prev.slice(-(MAX_POINTS - 1)), sample])
    })
    return () => {
      off?.()
      window.quickssh.monitor.stop(tabId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId])

  const latest = samples[samples.length - 1]
  const memPercent = latest && latest.memTotalMB > 0 ? (latest.memUsedMB / latest.memTotalMB) * 100 : 0

  return (
    <div className="flex h-44 flex-col border-t border-border bg-bg-alt">
      <div className="flex items-center justify-between px-4 py-1.5">
        <span className="text-xs font-medium text-text-muted flex items-center gap-1.5">
          <FontAwesomeIcon icon={faChartLine} className="w-3" />
          实时监控 · {tabId}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded px-2 py-0.5 text-xs hover:bg-surface"
          >
            <FontAwesomeIcon icon={paused ? faPlay : faPause} className="w-2.5 mr-1" />
            {paused ? '继续' : '暂停'}
          </button>
          <button
            onClick={() => setMonitorTabId(null)}
            className="rounded px-2 py-0.5 text-xs hover:bg-surface"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3" />
          </button>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-2 px-3 pb-2">
        <MetricCard
          title="CPU"
          value={latest ? `${latest.cpuPercent.toFixed(1)}%` : '--'}
          color="#3b82f6"
          data={samples.map((s) => s.cpuPercent)}
          max={100}
          unit="%"
        />
        <MetricCard
          title="内存"
          value={
            latest
              ? `${latest.memUsedMB}/${latest.memTotalMB}MB`
              : '--'
          }
          sub={latest ? `${memPercent.toFixed(0)}%` : ''}
          color="#22c55e"
          data={samples.map((s) => (s.memTotalMB > 0 ? (s.memUsedMB / s.memTotalMB) * 100 : 0))}
          max={100}
          unit="%"
        />
        <MetricCard
          title="网络 ↓↑"
          value={
            latest
              ? `${latest.netRxKBps.toFixed(0)}/${latest.netTxKBps.toFixed(0)} KB/s`
              : '--'
          }
          color="#f59e0b"
          data={samples.map((s) => s.netRxKBps + s.netTxKBps)}
          max={undefined}
          unit="KB/s"
        />
        <MetricCard
          title="磁盘 R/W"
          value={
            latest
              ? `${latest.diskReadKBps.toFixed(0)}/${latest.diskWriteKBps.toFixed(0)} KB/s`
              : '--'
          }
          color="#a855f7"
          data={samples.map((s) => s.diskReadKBps + s.diskWriteKBps)}
          max={undefined}
          unit="KB/s"
        />
      </div>
    </div>
  )
}

interface CardProps {
  title: string
  value: string
  sub?: string
  color: string
  data: number[]
  max?: number
  unit: string
}

function MetricCard({ title, value, sub, color, data, max, unit }: CardProps) {
  // 计算 y 轴最大值
  const dataMax = data.length ? Math.max(...data) : 0
  const yMax = max ?? Math.max(dataMax * 1.2, 1)

  const W = 100
  const H = 50
  const points = data
    .map((v, i) => {
      const x = data.length > 1 ? (i / (MAX_POINTS - 1)) * W : W
      const y = H - (Math.min(v, yMax) / yMax) * H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="flex flex-col rounded border border-border bg-surface/50 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{title}</span>
        {sub && <span className="text-xs font-medium" style={{ color }}>{sub}</span>}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
      <div className="monitor-grid mt-1 flex-1 overflow-hidden rounded">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
          {data.length > 1 && (
            <>
              <polygon
                points={`0,${H} ${points} ${W},${H}`}
                fill={color}
                opacity={0.15}
              />
              <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
