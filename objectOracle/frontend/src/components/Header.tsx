import React from 'react'
import type { HealthStatus } from '../types'

interface Props {
  health: HealthStatus | null
  isLive: boolean
  onToggleLive: () => void
}

export default function Header({ health, isLive, onToggleLive }: Props) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Logo mark */}
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg,#7c6df5,#22d3a5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#fff',
        }}>O</div>
        <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px' }}>
          Object<span style={{ color: 'var(--accent)' }}>Oracle</span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
          v1.0 · Scene Understanding & Object Detection
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Model status pills */}
        {health && (
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { name: 'YOLO', ok: health.yolo_loaded },
              { name: 'CLIP', ok: health.clip_loaded },
              { name: 'SAM',  ok: health.sam_loaded },
            ].map(({ name, ok }) => (
              <span key={name} style={{
                fontSize: 11, fontWeight: 600,
                padding: '3px 8px', borderRadius: 20,
                background: ok ? 'rgba(34,211,165,0.12)' : 'rgba(248,113,113,0.12)',
                color: ok ? 'var(--green)' : 'var(--red)',
                border: `1px solid ${ok ? 'rgba(34,211,165,0.3)' : 'rgba(248,113,113,0.3)'}`,
              }}>
                {name}
              </span>
            ))}
            <span style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 20,
              background: 'rgba(124,109,245,0.12)', color: 'var(--accent)',
              border: '1px solid rgba(124,109,245,0.3)',
            }}>
              {health.device.toUpperCase()}
            </span>
          </div>
        )}

        {/* Live toggle */}
        <button
          onClick={onToggleLive}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            background: isLive ? 'rgba(34,211,165,0.12)' : 'rgba(139,148,158,0.1)',
            color: isLive ? 'var(--green)' : 'var(--text-muted)',
            border: `1px solid ${isLive ? 'rgba(34,211,165,0.3)' : 'var(--border)'}`,
            fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
          }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isLive ? 'var(--green)' : 'var(--text-muted)',
            animation: isLive ? 'pulse 1.5s infinite' : 'none',
          }} />
          {isLive ? 'LIVE' : 'PAUSED'}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </header>
  )
}
