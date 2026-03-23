import { useRef, useEffect, useCallback, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import DetectionList from '../components/DetectionList'
import StatCard from '../components/StatCard'

const card = { background: '#161b27', border: '1px solid #1e2535', borderRadius: 12, padding: '20px' }
const CLASS_COLORS: Record<string, string> = {
  person: '#7c6ef5', car: '#22d3ee', bicycle: '#f97316', dog: '#facc15',
  cat: '#f472b6', truck: '#34d399', bus: '#60a5fa', 'traffic light': '#fb923c',
}
function colorFor(label: string) { return CLASS_COLORS[label.toLowerCase()] || '#94a3b8' }

export default function StreamPage() {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number>()
  const [active, setActive]     = useState(false)
  const [confidence, setConf]   = useState(0.40)
  const [frameCount, setFrameCount] = useState(0)
  const { connected, lastResult, fps, connect, disconnect, sendFrame } = useWebSocket()

  const drawOverlay = useCallback(() => {
    const overlay = overlayRef.current
    const video   = videoRef.current
    if (!overlay || !video) return
    const ctx = overlay.getContext('2d')!
    overlay.width  = video.videoWidth  || 640
    overlay.height = video.videoHeight || 480
    ctx.clearRect(0, 0, overlay.width, overlay.height)

    if (lastResult) {
      lastResult.objects.forEach(obj => {
        const [x1, y1, x2, y2] = obj.bbox
        const scaleX = overlay.width  / (lastResult.image_size?.width  || overlay.width)
        const scaleY = overlay.height / (lastResult.image_size?.height || overlay.height)
        const rx1 = x1 * scaleX, ry1 = y1 * scaleY
        const rw  = (x2 - x1) * scaleX, rh = (y2 - y1) * scaleY
        const color = colorFor(obj.label)
        ctx.strokeStyle = color
        ctx.lineWidth   = 2
        ctx.strokeRect(rx1, ry1, rw, rh)
        const label = `${obj.label} ${Math.round(obj.confidence * 100)}%`
        ctx.font = 'bold 13px system-ui'
        const tw = ctx.measureText(label).width
        ctx.fillStyle = color
        ctx.fillRect(rx1, ry1 - 20, tw + 10, 20)
        ctx.fillStyle = '#fff'
        ctx.fillText(label, rx1 + 5, ry1 - 5)
      })
    }
  }, [lastResult])

  useEffect(() => { drawOverlay() }, [drawOverlay])

  // Capture + send frames
  const captureLoop = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !connected) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const b64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1]
    sendFrame(b64, confidence)
    setFrameCount(f => f + 1)
    rafRef.current = requestAnimationFrame(() => {
      setTimeout(captureLoop, 100) // ~10fps send rate
    })
  }, [connected, sendFrame, confidence])

  const startStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null)
    if (!stream) { alert('Camera permission denied'); return }
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play()
    }
    connect()
    setActive(true)
  }, [connect])

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current!)
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    disconnect()
    setActive(false)
  }, [disconnect])

  useEffect(() => {
    if (connected && active) captureLoop()
    return () => cancelAnimationFrame(rafRef.current!)
  }, [connected, active, captureLoop])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0' }}>Live Stream</h1>
        <p style={{ color: '#4a5568', fontSize: 14, marginTop: 4 }}>Real-time webcam detection via WebSocket</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Video + overlay */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative', background: '#0f1117', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9' }}>
            <video ref={videoRef} style={{ width: '100%', display: 'block' }} muted playsInline />
            <canvas ref={overlayRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {!active && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 48 }}>◉</div>
                <div style={{ color: '#4a5568', fontSize: 14 }}>Camera not started</div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!active ? (
              <button onClick={startStream} style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: '#7c6ef5', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}>
                Start Camera
              </button>
            ) : (
              <button onClick={stopStream} style={{
                padding: '10px 24px', borderRadius: 8, border: '1px solid #ef4444',
                background: 'transparent', color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}>
                Stop
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <span style={{ fontSize: 12, color: '#4a5568' }}>Confidence</span>
              <input
                type="range" min={0.05} max={0.95} step={0.05} value={confidence}
                onChange={e => setConf(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 12, color: '#e2e8f0', minWidth: 32 }}>{confidence.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatCard
            label="WS status"
            value={connected ? 'Connected' : 'Offline'}
            accent={connected ? '#34d399' : '#ef4444'}
          />
          <StatCard label="Send FPS" value={fps} accent="#22d3ee" />
          <StatCard label="Frames sent" value={frameCount.toLocaleString()} />

          {lastResult && (
            <>
              <StatCard label="Objects" value={lastResult.object_count} accent="#7c6ef5" />
              <StatCard label="Inference" value={`${lastResult.inference_ms}ms`} accent="#f97316" />
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>DETECTIONS</div>
                <DetectionList objects={lastResult.objects} />
              </div>
              {lastResult.scene_tags.length > 0 && (
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>SCENE</div>
                  {lastResult.scene_tags.slice(0, 3).map((t, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#94a3b8', padding: '4px 0' }}>
                      {t.label} — <span style={{ color: '#7c6ef5' }}>{Math.round(t.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
