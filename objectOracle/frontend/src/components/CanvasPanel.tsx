import React, { useRef, useEffect, useCallback } from 'react'
import type { DetectionResult, DisplayMode } from '../types'
import { drawDetections } from '../canvas'

interface Props {
  result: DetectionResult | null
  imageUrl: string | null
  mode: DisplayMode
  isLive: boolean
}

export default function CanvasPanel({ result, imageUrl, mode, isLive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)
  const animRef   = useRef<number>(0)

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Draw image
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, W, H)
    } else {
      // Placeholder grid background
      ctx.fillStyle = '#161b27'
      ctx.fillRect(0, 0, W, H)
      for (let x = 0; x < W; x += 32) {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.font = '14px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Upload an image or enable webcam to start detection', W / 2, H / 2)
      ctx.textAlign = 'left'
    }

    // Scan line animation
    if (isLive) {
      const t = Date.now() / 1000
      const scanY = ((t * 80) % H)
      ctx.fillStyle = 'rgba(124,109,245,0.06)'
      ctx.fillRect(0, scanY - 1, W, 3)
    }

    // Draw detections
    if (result && imgRef.current) {
      const scaleX = W / result.image_size.width
      const scaleY = H / result.image_size.height
      drawDetections(ctx, result.objects, mode, scaleX, scaleY)
    }

    animRef.current = requestAnimationFrame(render)
  }, [result, mode, isLive])

  // Load image when URL changes
  useEffect(() => {
    if (!imageUrl) {
      imgRef.current = null
      return
    }
    const img = new Image()
    img.onload = () => { imgRef.current = img }
    img.src = imageUrl
  }, [imageUrl])

  // Animation loop
  useEffect(() => {
    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [render])

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return (
    <div style={{
      position: 'relative',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      height: 420,
    }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Overlay labels */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        fontSize: 11, fontWeight: 600,
        padding: '4px 10px', borderRadius: 20,
        background: 'rgba(15,17,23,0.75)',
        border: '1px solid var(--border)',
        color: 'var(--text-muted)',
        backdropFilter: 'blur(4px)',
      }}>
        Scene view · {mode}
      </div>

      {result && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          fontSize: 11, fontWeight: 600,
          padding: '4px 10px', borderRadius: 20,
          background: 'rgba(34,211,165,0.12)',
          border: '1px solid rgba(34,211,165,0.3)',
          color: 'var(--green)',
        }}>
          {result.inference_ms}ms · {result.object_count} obj
        </div>
      )}
    </div>
  )
}
