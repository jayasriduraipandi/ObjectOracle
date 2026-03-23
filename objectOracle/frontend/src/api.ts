import type { DetectionResult, HealthStatus } from './types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function detectImage(
  file: File,
  confidence?: number,
  scene = true,
  segmentation = false
): Promise<DetectionResult> {
  const form = new FormData()
  form.append('file', file)

  const params = new URLSearchParams()
  if (confidence !== undefined) params.set('confidence', String(confidence))
  params.set('scene', String(scene))
  params.set('segmentation', String(segmentation))

  const res = await fetch(`${BASE}/detect?${params}`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Detection failed: ${res.status}`)
  return res.json()
}

export async function detectUrl(
  url: string,
  confidence?: number
): Promise<DetectionResult> {
  const params = new URLSearchParams({ url })
  if (confidence !== undefined) params.set('confidence', String(confidence))

  const res = await fetch(`${BASE}/detect/url?${params}`, { method: 'POST' })
  if (!res.ok) throw new Error(`URL detection failed: ${res.status}`)
  return res.json()
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new Error('Health check failed')
  return res.json()
}

export function createWebSocket(): WebSocket {
  const wsUrl = BASE.replace(/^http/, 'ws') + '/stream'
  return new WebSocket(wsUrl)
}

/** Convert a canvas frame to base64 JPEG for WebSocket streaming */
export function canvasToBase64(canvas: HTMLCanvasElement, quality = 0.7): string {
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return dataUrl.split(',')[1]
}
