import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { LogEntry, DetectedObject } from '../types'
import { getColor } from '../canvas'

interface Props {
  logs: LogEntry[]
  objects: DetectedObject[]
}

export default function LogPanel({ logs, objects }: Props) {
  // Build per-class bar chart data
  const classCounts = objects.reduce<Record<string, number>>((acc, obj) => {
    acc[obj.label] = (acc[obj.label] ?? 0) + 1
    return acc
  }, {})
  const chartData = Object.entries(classCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Class distribution chart */}
      {chartData.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Class distribution
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8892a4' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8892a4' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 12 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.label} fill={getColor(entry.label)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Activity log */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '14px 16px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Activity log
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {logs.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0' }}>No activity yet</div>
          ) : logs.map(entry => (
            <div key={entry.id} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '6px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 56, marginTop: 1 }}>
                {entry.time}
              </span>
              <span style={{
                fontSize: 12,
                color: entry.type === 'success' ? 'var(--green)'
                     : entry.type === 'warning' ? 'var(--amber)'
                     : 'var(--text-primary)',
              }}>
                {entry.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
