import { useState, useRef, useCallback, useEffect } from 'react'
import { DetectionResponse } from '../types/detection'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/stream'

export function useWebSocket() {
  const wsRef                   = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastResult, setLastResult] = useState<DetectionResponse | null>(null)
  const [fps, setFps]           = useState(0)
  const frameCount              = useRef(0)
  const fpsTimer                = useRef<ReturnType<typeof setInterval>>()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const ws = new WebSocket(WS_URL)

    ws.onopen  = () => {
      setConnected(true)
      fpsTimer.current = setInterval(() => {
        setFps(frameCount.current)
        frameCount.current = 0
      }, 1000)
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (!data.error) {
          setLastResult(data)
          frameCount.current++
        }
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      setConnected(false)
      clearInterval(fpsTimer.current)
      setFps(0)
    }

    wsRef.current = ws
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const sendFrame = useCallback((base64: string, confidence?: number) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ frame: base64, confidence, scene: true }))
  }, [])

  useEffect(() => () => disconnect(), [disconnect])

  return { connected, lastResult, fps, connect, disconnect, sendFrame }
}
