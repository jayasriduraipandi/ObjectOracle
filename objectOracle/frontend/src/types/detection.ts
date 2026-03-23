export interface DetectedObject {
  label: string
  confidence: number
  bbox: [number, number, number, number]
  class_id: number
  track_id?: number
}

export interface SceneTag {
  label: string
  confidence: number
}

export interface DetectionResponse {
  objects: DetectedObject[]
  scene_tags: SceneTag[]
  inference_ms: number
  image_size: { width: number; height: number }
  object_count: number
}
