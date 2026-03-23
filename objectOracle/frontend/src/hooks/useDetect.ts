import { useState, useCallback } from 'react'
import { DetectionResponse } from '../types/detection'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useDetect() {
  const [result, setResult]   = useState<DetectionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const detectFile = useCallback(async (
    file: File,
    opts?: { confidence?: number; scene?: boolean; segmentation?: boolean }
  ) => {
    setLoading(true)
    setError(null)

    const form = new FormData()
    form.append('file', file)

    const params = new URLSearchParams()
    if (opts?.confidence) params.set('confidence', String(opts.confidence))
    if (opts?.scene !== undefined) params.set('scene', String(opts.scene))
    if (opts?.segmentation)        params.set('segmentation', 'true')

    try {
      const res = await fetch(`${API_BASE}/detect?${params}`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const data: DetectionResponse = await res.json()
      setResult(data)
      return data
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const detectUrl = useCallback(async (url: string, confidence?: number) => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ url })
    if (confidence) params.set('confidence', String(confidence))
    try {
      const res = await fetch(`${API_BASE}/detect/url?${params}`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: DetectionResponse = await res.json()
      setResult(data)
      return data
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { result, loading, error, detectFile, detectUrl }
}
