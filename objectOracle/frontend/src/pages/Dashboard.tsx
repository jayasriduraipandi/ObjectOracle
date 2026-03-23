import { useState, useEffect } from 'react'
import StatCard from '../components/StatCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const DEMO_OBJECTS = [
  { label: 'Person', count: 142, color: '#7c6ef5' },
  { label: 'Car',    count: 98,  color: '#22d3ee' },
  { label: 'Bicycle',count: 45,  color: '#f97316' },
  { label: 'Dog',    count: 31,  color: '#facc15' },
  { label: 'Bus',    count: 22,  color: '#60a5fa' },
  { label: 'Truck',  count: 17,  color: '#34d399' },
]

const DEMO_TIMELINE = Array.from({ length: 20 }, (_, i) => ({
  t: `${i * 3}s`,
  objects: Math.floor(3 + Math.random() * 8),
  ms: Math.floor(14 + Math.random() * 10),
}))

const card = { background: '#161b27', border: '1px solid #1e2535', borderRadius: 12, padding: '20px' }

export default function Dashboard() {
  const [health, setHealth] = useState<any>(null)
  const [frames, setFrames] = useState(3847)

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'offline', yolo_loaded: false, clip_loaded: false, sam_loaded: false, device: 'N/A' }))
  }, [])

  // Tick frame counter for demo
  useEffect(() => {
    const t = setInterval(() => setFrames(f => f + Math.floor(Math.random() * 3)), 800)
    return () => clearInterval(t)
  }, [])

  const modelStatus = (loaded: boolean, name: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: loaded ? '#34d399' : '#ef4444', flexShrink: 0, display: 'inline-block' }} />
      <span style={{ color: '#94a3b8' }}>{name}</span>
      <span style={{ marginLeft: 'auto', color: loaded ? '#34d399' : '#ef4444', fontSize: 11 }}>
        {loaded ? 'loaded' : 'offline'}
      </span>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0' }}>Dashboard</h1>
        <p style={{ color: '#4a5568', fontSize: 14, marginTop: 4 }}>System overview and detection statistics</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Frames processed" value={frames.toLocaleString()} sub="since last restart" />
        <StatCard label="Avg inference" value="17ms" sub="YOLOv8 nano" accent="#22d3ee" />
        <StatCard label="Objects today" value="2,341" sub="across all sessions" accent="#34d399" />
        <StatCard label="Top class" value="Person" sub="38% of detections" accent="#f97316" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
        {/* Bar chart */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>
            Detection frequency by class
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DEMO_OBJECTS} barSize={32}>
              <XAxis dataKey="label" tick={{ fill: '#4a5568', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f1117', border: '1px solid #1e2535', borderRadius: 8, color: '#e2e8f0' }}
                cursor={{ fill: '#1e2535' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {DEMO_OBJECTS.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model status panel */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>
            Model status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {modelStatus(health?.yolo_loaded ?? false, 'YOLOv8 detection')}
            {modelStatus(health?.clip_loaded ?? false, 'CLIP scene classifier')}
            {modelStatus(health?.sam_loaded  ?? false, 'SAM segmentation')}
          </div>
          <div style={{ marginTop: 20, padding: '12px', background: '#0f1117', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 6 }}>API status</div>
            <div style={{ fontSize: 13, color: health?.status === 'ok' ? '#34d399' : '#ef4444', fontWeight: 600 }}>
              {health?.status === 'ok' ? '● Connected' : '○ Offline'}
            </div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
              Device: {health?.device ?? '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Inference time timeline */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>
          Inference time over session (ms)
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={DEMO_TIMELINE} barSize={10}>
            <XAxis dataKey="t" tick={{ fill: '#2d3748', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0f1117', border: '1px solid #1e2535', borderRadius: 8, color: '#e2e8f0' }}
              cursor={{ fill: '#1e2535' }}
            />
            <Bar dataKey="ms" fill="#7c6ef5" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
