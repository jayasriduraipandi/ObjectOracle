import type { DetectedObject, DisplayMode } from './types'

// Palette: consistent color per class label
const PALETTE: Record<string, string> = {}
const COLORS = [
  '#7c6df5','#22d3a5','#f59e0b','#f87171','#60a5fa',
  '#e879f9','#34d399','#fb923c','#a78bfa','#38bdf8',
]
let colorIdx = 0

export function getColor(label: string): string {
  if (!PALETTE[label]) {
    PALETTE[label] = COLORS[colorIdx % COLORS.length]
    colorIdx++
  }
  return PALETTE[label]
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function drawDetections(
  ctx: CanvasRenderingContext2D,
  objects: DetectedObject[],
  mode: DisplayMode,
  scaleX: number,
  scaleY: number
) {
  objects.forEach((obj, idx) => {
    const [x1, y1, x2, y2] = obj.bbox
    const sx1 = x1 * scaleX
    const sy1 = y1 * scaleY
    const sw  = (x2 - x1) * scaleX
    const sh  = (y2 - y1) * scaleY
    const color = getColor(obj.label)

    if (mode === 'segmentation') {
      // Filled mask-style overlay
      ctx.fillStyle = hexToRgba(color, 0.25)
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(sx1, sy1, sw, sh, 4)
      ctx.fill()
      ctx.stroke()
    } else if (mode === 'tracking') {
      // Dashed box + track trail
      ctx.setLineDash([6, 4])
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.strokeRect(sx1, sy1, sw, sh)
      ctx.setLineDash([])
      // Ghost trail
      for (let i = 1; i <= 3; i++) {
        ctx.strokeStyle = hexToRgba(color, 0.3 - i * 0.08)
        ctx.lineWidth = 0.5
        ctx.strokeRect(sx1 - i * 4, sy1 + i * 3, sw, sh)
      }
      // Track ID badge
      if (obj.track_id !== undefined) {
        const tid = `#${obj.track_id}`
        ctx.font = 'bold 10px system-ui'
        const tw = ctx.measureText(tid).width
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(sx1 + sw - tw - 10, sy1 + 4, tw + 8, 16, 3)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.fillText(tid, sx1 + sw - tw - 6, sy1 + 15)
      }
    } else {
      // Default bounding box
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(sx1, sy1, sw, sh)

      // Corner accents
      const clen = Math.min(sw, sh) * 0.15
      ctx.lineWidth = 3
      // TL
      ctx.beginPath(); ctx.moveTo(sx1, sy1 + clen); ctx.lineTo(sx1, sy1); ctx.lineTo(sx1 + clen, sy1); ctx.stroke()
      // TR
      ctx.beginPath(); ctx.moveTo(sx1 + sw - clen, sy1); ctx.lineTo(sx1 + sw, sy1); ctx.lineTo(sx1 + sw, sy1 + clen); ctx.stroke()
      // BL
      ctx.beginPath(); ctx.moveTo(sx1, sy1 + sh - clen); ctx.lineTo(sx1, sy1 + sh); ctx.lineTo(sx1 + clen, sy1 + sh); ctx.stroke()
      // BR
      ctx.beginPath(); ctx.moveTo(sx1 + sw - clen, sy1 + sh); ctx.lineTo(sx1 + sw, sy1 + sh); ctx.lineTo(sx1 + sw, sy1 + sh - clen); ctx.stroke()
    }

    // Label pill
    const label = `${obj.label} ${Math.round(obj.confidence * 100)}%`
    ctx.font = '11px system-ui'
    const tw = ctx.measureText(label).width
    const pillH = 20
    const pillY = sy1 > pillH + 4 ? sy1 - pillH - 2 : sy1 + 4

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(sx1, pillY, tw + 16, pillH, 4)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px system-ui'
    ctx.fillText(label, sx1 + 8, pillY + 14)
  })
}
