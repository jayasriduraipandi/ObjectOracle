"""
api/routes/detect.py
REST endpoints for single-image and batch detection.
"""
from __future__ import annotations
import io
from fastapi import APIRouter, File, UploadFile, Query, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
from loguru import logger

from ..core.inference import run_full_pipeline
from ..core.config import settings
from ..schemas.detection import DetectionResponse, BatchDetectionResponse

router = APIRouter(prefix="/detect", tags=["detection"])


def _load_image(data: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")


@router.post(
    "",
    response_model=DetectionResponse,
    summary="Detect objects in a single image",
)
async def detect_single(
    file: UploadFile = File(..., description="Image file (JPEG, PNG, WebP)"),
    confidence: float = Query(
        default=None,
        ge=0.01,
        le=1.0,
        description="Override confidence threshold",
    ),
    scene: bool = Query(default=True, description="Include CLIP scene classification"),
    segmentation: bool = Query(default=False, description="Include SAM segmentation"),
):
    """
    Run the full ObjectOracle pipeline on an uploaded image.

    Returns detected objects with bounding boxes, scene tags, and
    optional segmentation masks.
    """
    data = await file.read()
    image = _load_image(data)

    logger.info(f"Detecting in {file.filename} ({image.width}x{image.height})")

    result = run_full_pipeline(
        image,
        include_scene=scene,
        include_segmentation=segmentation,
        confidence=confidence,
    )

    # Reshape for response model
    return DetectionResponse(
        objects=result["objects"],
        scene_tags=result.get("scene_tags", []),
        segmentation=result.get("segmentation", []),
        inference_ms=result["inference_ms"],
        image_size=result["image_size"],
    )


@router.post(
    "/batch",
    response_model=BatchDetectionResponse,
    summary="Detect objects in multiple images",
)
async def detect_batch(
    files: list[UploadFile] = File(...),
    confidence: float = Query(default=None, ge=0.01, le=1.0),
    scene: bool = Query(default=True),
):
    """
    Process multiple images in one request. Returns per-image results.
    """
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 images per batch.")

    results = []
    total_objects = 0

    for file in files:
        data = await file.read()
        image = _load_image(data)
        result = run_full_pipeline(image, include_scene=scene, confidence=confidence)
        response = DetectionResponse(
            objects=result["objects"],
            scene_tags=result.get("scene_tags", []),
            inference_ms=result["inference_ms"],
            image_size=result["image_size"],
        )
        results.append(response)
        total_objects += len(result["objects"])

    avg_ms = round(sum(r.inference_ms for r in results) / len(results), 1)

    return BatchDetectionResponse(
        results=results,
        total_images=len(results),
        total_objects=total_objects,
        avg_inference_ms=avg_ms,
    )


@router.post(
    "/url",
    response_model=DetectionResponse,
    summary="Detect objects in an image from URL",
)
async def detect_from_url(
    url: str = Query(..., description="Publicly accessible image URL"),
    confidence: float = Query(default=None, ge=0.01, le=1.0),
    scene: bool = Query(default=True),
):
    """
    Download an image from a URL and run detection.
    """
    import httpx

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.content
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    image = _load_image(data)
    result = run_full_pipeline(image, include_scene=scene, confidence=confidence)

    return DetectionResponse(
        objects=result["objects"],
        scene_tags=result.get("scene_tags", []),
        inference_ms=result["inference_ms"],
        image_size=result["image_size"],
    )
