import { useState, useRef, useCallback } from 'react'
import { useDetect } from '../hooks/useDetect'
import AnnotatedCanvas from '../components/AnnotatedCanvas'
import DetectionList from '../components/DetectionList'
import StatCard from '../components/StatCard'

const card = { background: '#161b27', border: '1px solid #1e2535', borderRadius: 12, padding: '20px' }

export default function UploadPage() {
  const [imageUrl, setImageUrl]   = useState<string | null>(null)
  const [confidence, setConf]     = useState(0.40)
  const [scene, setScene]         = useState(true)
  const [segmentation, setSeg]    = useState(false)
  const [dragging, setDragging]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { result, loading, error, detectFile } = useDetect()

  const handleFile = useCallback(async (file: File) => {
    setImageUrl(URL.createObjectURL(file))
    await detectFile(file, { confidence, scene, segmentation })
  }, [confidence, scene, segmentation, detectFile])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0' }}>Upload Image</h1>
        <p style={{ color: '#4a5568', fontSize: 14, marginTop: 4 }}>Run full detection pipeline on a single image</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Left: upload + result canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#7c6ef5' : '#1e2535'}`,
              borderRadius: 12, padding: '2rem', textAlign: 'center',
              cursor: 'pointer', background: dragging ? '#7c6ef508' : '#0f1117',
              transition: 'all 0.2s', display: imageUrl ? 'none' : 'block',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>⬆</div>
            <div style={{ color: '#94a3b8', fontSize: 15, marginBottom: 6 }}>
              Drop an image or click to browse
            </div>
            <div style={{ color: '#4a5568', fontSize: 12 }}>JPEG · PNG · WebP</div>
            <input
              ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>

          {/* Canvas result */}
          {imageUrl && (
            <div style={card}>
              {loading && (
                <div style={{ textAlign: 'center', color: '#7c6ef5', padding: '1rem', fontSize: 14 }}>
                  Running inference...
                </div>
              )}
              <AnnotatedCanvas
                imageUrl={imageUrl}
                objects={result?.objects || []}
                naturalSize={result?.image_size || null}
              />
              <button
                onClick={() => { setImageUrl(null) }}
                style={{
                  marginTop: 12, fontSize: 13, padding: '8px 16px', borderRadius: 8,
                  border: '1px solid #1e2535', background: 'transparent', color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          )}

          {error && (
            <div style={{ background: '#ef444420', border: '1px solid #ef4444', borderRadius: 8, padding: 12, color: '#fca5a5', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Right: settings + results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Settings */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 14 }}>SETTINGS</div>

            <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              Confidence: <strong style={{ color: '#e2e8f0' }}>{confidence.toFixed(2)}</strong>
            </label>
            <input
              type="range" min={0.05} max={0.95} step={0.05} value={confidence}
              onChange={e => setConf(Number(e.target.value))}
              style={{ width: '100%', marginBottom: 14 }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginBottom: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={scene} onChange={e => setScene(e.target.checked)} />
              Scene classification (CLIP)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
              <input type="checkbox" checked={segmentation} onChange={e => setSeg(e.target.checked)} />
              Segmentation (SAM)
            </label>
          </div>

          {/* Stats */}
          {result && (
            <>
              <StatCard label="Objects found" value={result.object_count} />
              <StatCard label="Inference time" value={`${result.inference_ms}ms`} accent="#22d3ee" />
              <StatCard label="Image size" value={`${result.image_size.width}×${result.image_size.height}`} accent="#34d399" />
            </>
          )}

          {/* Detection list */}
          {result && result.objects.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>DETECTIONS</div>
              <DetectionList objects={result.objects} />
            </div>
          )}

          {/* Scene tags */}
          {result && result.scene_tags.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>SCENE TAGS</div>
              {result.scene_tags.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: i < result.scene_tags.length - 1 ? '1px solid #1e2535' : 'none' }}>
                  <span style={{ color: '#e2e8f0' }}>{t.label}</span>
                  <span style={{ color: '#7c6ef5', fontWeight: 600 }}>{Math.round(t.confidence * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
