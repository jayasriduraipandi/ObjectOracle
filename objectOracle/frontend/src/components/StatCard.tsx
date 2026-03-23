interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: string
}

export default function StatCard({ label, value, sub, accent = '#7c6ef5' }: Props) {
  return (
    <div style={{
      background: '#161b27', border: '1px solid #1e2535', borderRadius: 12,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 12, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#4a5568' }}>{sub}</div>}
    </div>
  )
}
