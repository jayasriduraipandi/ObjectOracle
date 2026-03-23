import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  color?: string
  sub?: string
}

function StatCard({ label, value, color, sub }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '14px 18px',
      flex: 1,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, color: color ?? 'var(--text-primary)', letterSpacing: '-0.5px' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

interface Props {
  objectCount: number
  confidence: number
  inferenceMs: number
  framesProcessed: number
}

export default function StatsBar({ objectCount, confidence, inferenceMs, framesProcessed }: Props) {
  const fps = inferenceMs > 0 ? Math.round(1000 / inferenceMs) : 0

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <StatCard label="Objects detected"  value={objectCount}   color="var(--accent)" />
      <StatCard label="Scene confidence"  value={`${Math.round(confidence * 100)}%`} color="var(--green)" />
      <StatCard label="Inference time"    value={`${inferenceMs}ms`} color="var(--amber)" sub={`~${fps} FPS`} />
      <StatCard label="Frames processed"  value={framesProcessed.toLocaleString()} />
    </div>
  )
}
