import { Page } from '../App'

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard',    icon: '▣' },
  { id: 'upload',    label: 'Upload Image', icon: '⬆' },
  { id: 'stream',    label: 'Live Stream',  icon: '◉' },
]

interface Props { current: Page; onNavigate: (p: Page) => void }

export default function Sidebar({ current, onNavigate }: Props) {
  return (
    <nav style={{
      width: 220, background: '#161b27', borderRight: '1px solid #1e2535',
      padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0,
    }}>
      <div style={{ marginBottom: '2rem', paddingLeft: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.5px' }}>
          Object<span style={{ color: '#7c6ef5' }}>Oracle</span>
        </div>
        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>Scene Understanding AI</div>
      </div>
      {NAV.map(n => (
        <button key={n.id} onClick={() => onNavigate(n.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14,
          fontWeight: current === n.id ? 600 : 400,
          background: current === n.id ? '#7c6ef520' : 'transparent',
          color: current === n.id ? '#a89cf7' : '#94a3b8',
          transition: 'all 0.15s', textAlign: 'left', width: '100%',
        }}>
          <span style={{ fontSize: 16 }}>{n.icon}</span>
          {n.label}
        </button>
      ))}
      <div style={{ marginTop: 'auto', fontSize: 11, color: '#2d3748', paddingLeft: 8 }}>
        v1.0.0 · ObjectOracle
      </div>
    </nav>
  )
}
