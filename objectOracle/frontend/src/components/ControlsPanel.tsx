import React, { useRef } from 'react'
import type { DisplayMode } from '../types'

interface Props {
  mode: DisplayMode
  confidence: number
  onModeChange: (m: DisplayMode) => void
  onConfidenceChange: (v: number) => void
  onFileUpload: (file: File) => void
  onUrlDetect: (url: string) => void
  isLoading: boolean
}

const MODES: { id: DisplayMode; label: string }[] = [
  { id: 'bbox',         label: 'Bounding boxes' },
  { id: 'segmentation', label: 'Segmentation' },
  { id: 'tracking',     label: 'Tracking' },
]

export default function ControlsPanel({
  mode, confidence, onModeChange, onConfidenceChange,
  onFileUpload, onUrlDetect, isLoading,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const urlRef  = useRef<HTMLInputElement>(null)

  const btnBase: React.CSSProperties = {
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    border: '1px solid var(--border)', background: 'transparent',
    color: 'var(--text-muted)', transition: 'all 0.15s', cursor: 'pointer',
  }
  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    border: '1px solid rgba(124,109,245,0.4)',
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Controls
      </div>

      {/* Display mode */}
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Display mode</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => onModeChange(m.id)}
              style={m.id === mode ? btnActive : btnBase}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Confidence threshold */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Confidence threshold</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <input type="range" min={5} max={95} value={Math.round(confidence * 100)}
          onChange={e => onConfidenceChange(Number(e.target.value) / 100)}
          style={{ width: '100%' }} />
      </div>

      {/* Upload image */}
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Upload image</div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFileUpload(f) }} />
        <button onClick={() => fileRef.current?.click()}
          disabled={isLoading}
          style={{
            ...btnBase,
            width: '100%', textAlign: 'center',
            padding: '10px 0',
            opacity: isLoading ? 0.5 : 1,
            background: isLoading ? 'transparent' : 'rgba(124,109,245,0.08)',
          }}>
          {isLoading ? 'Detecting...' : '+ Choose image file'}
        </button>
      </div>

      {/* URL detection */}
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Detect from URL</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input ref={urlRef} type="url" placeholder="https://..." style={{
            flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)', outline: 'none',
          }} />
          <button disabled={isLoading}
            onClick={() => { const u = urlRef.current?.value.trim(); if (u) onUrlDetect(u) }}
            style={{ ...btnBase, flexShrink: 0 }}>
            Go
          </button>
        </div>
      </div>

      {/* API docs link */}
      <a href="http://localhost:8000/docs" target="_blank" rel="noopener"
        style={{
          fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
          borderTop: '1px solid var(--border)', paddingTop: 12,
        }}>
        View API docs (Swagger) →
      </a>
    </div>
  )
}
