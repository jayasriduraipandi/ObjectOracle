import { useEffect, useRef } from 'react'
import { DetectedObject } from '../types/detection'

const CLASS_COLORS: Record<string, string> = {
  person: '#7c6ef5', car: '#22d3ee', bicycle: '#f97316', dog: '#facc15',
  cat: '#f472b6', truck: '#34d399', bus: '#60a5fa', 'traffic light': '#fb923c',
}
function colorFor(label: string) {
  return CLASS_COLORS[label.toLowerCase()] || '#94a3b8'
}

interface Props {
  imageUrl: string | null
  objects: DetectedObject[]
  naturalSize: { width: number; height: number } | null
}

export default function AnnotatedCanvas({ imageUrl, objects, naturalSize }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageUrl) return
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.src = imageUrl
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)

      objects.forEach(obj => {
        const [x1, y1, x2, y2] = obj.bbox
        const color = colorFor(obj.label)
        ctx.strokeStyle = color
        ctx.lineWidth = 2.5
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

        const label = `${obj.label} ${Math.round(obj.confidence * 100)}%`
        ctx.font = 'bold 14px system-ui'
        const tw = ctx.measureText(label).width
        ctx.fillStyle = color
        ctx.fillRect(x1, y1 - 22, tw + 12, 22)
        ctx.fillStyle = '#fff'
        ctx.fillText(label, x1 + 6, y1 - 6)
      })
    }
  }, [imageUrl, objects])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', borderRadius: 8, display: imageUrl ? 'block' : 'none' }}
    />
  )
}
