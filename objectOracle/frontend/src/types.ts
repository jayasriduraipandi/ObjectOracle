export interface DetectedObject {
  label: string
  confidence: number
  bbox: [number, number, number, number]  // x1, y1, x2, y2
  class_id: number
  track_id?: number
}

export interface SceneTag {
  label: string
  confidence: number
}

export interface ImageSize {
  width: number
  height: number
}

export interface DetectionResult {
  objects: DetectedObject[]
  scene_tags: SceneTag[]
  segmentation: any[]
  inference_ms: number
  image_size: ImageSize
  object_count: number
}

export interface HealthStatus {
  status: string
  yolo_loaded: boolean
  clip_loaded: boolean
  sam_loaded: boolean
  device: string
}

export type DisplayMode = 'bbox' | 'segmentation' | 'tracking'

export interface LogEntry {
  id: number
  time: string
  message: string
  type: 'info' | 'warning' | 'success'
}
