"""
api/schemas/detection.py
Pydantic request/response models for ObjectOracle API.
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional


class BoundingBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int

    @property
    def width(self) -> int:
        return self.x2 - self.x1

    @property
    def height(self) -> int:
        return self.y2 - self.y1


class DetectedObject(BaseModel):
    label: str = Field(..., description="Class name")
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: list[int] = Field(..., description="[x1, y1, x2, y2]")
    class_id: int
    track_id: Optional[int] = None
    mask_area: Optional[int] = None


class SceneTag(BaseModel):
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class ImageSize(BaseModel):
    width: int
    height: int


class DetectionResponse(BaseModel):
    objects: list[DetectedObject]
    scene_tags: list[SceneTag] = []
    segmentation: list[dict] = []
    inference_ms: float
    image_size: ImageSize
    object_count: int = 0

    model_config = {"from_attributes": True}

    def model_post_init(self, __context):
        self.object_count = len(self.objects)


class BatchDetectionResponse(BaseModel):
    results: list[DetectionResponse]
    total_images: int
    total_objects: int
    avg_inference_ms: float


class HealthResponse(BaseModel):
    status: str
    yolo_loaded: bool
    clip_loaded: bool
    sam_loaded: bool
    device: str
