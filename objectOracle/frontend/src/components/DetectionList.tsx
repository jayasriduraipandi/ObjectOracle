import React from 'react'
import type { DetectedObject, SceneTag } from '../types'
import { getColor } from '../canvas'

interface Props {
  objects: DetectedObject[]
  sceneTags: SceneTag[]
}

export default function DetectionList({ objects, sceneTags }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '14px 16px',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
        }}>
          Detections ({objects.length})
        </div>
        {objects.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No objects detected</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {objects.map((obj, i) => {
              const color = getColor(obj.label)
              const pct = Math.round(obj.confidence * 100)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: 'var(--text-primary)' }}>{obj.label}</span>
                  <div style={{ flex: 2, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Scene classification
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {sceneTags.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>
          ) : sceneTags.map((tag, i) => (
            <span key={i} style={{
              fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20,
              background: i === 0 ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)',
              color: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${i === 0 ? 'rgba(124,109,245,0.35)' : 'var(--border)'}`,
            }}>
              {tag.label} <span style={{ opacity: 0.7 }}>{Math.round(tag.confidence * 100)}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
