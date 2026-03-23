"""
api/routes/health.py
Health check and model status endpoints.
"""
from fastapi import APIRouter
from ..core.model_loader import registry
from ..core.config import settings
from ..schemas.detection import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse, summary="System health check")
def health():
    return HealthResponse(
        status="ok",
        yolo_loaded=hasattr(registry, "yolo"),
        clip_loaded=getattr(registry, "clip_model", None) is not None,
        sam_loaded=getattr(registry, "sam_predictor", None) is not None,
        device=settings.device,
    )


@router.get("/", summary="API info")
def root():
    return {
        "name": "ObjectOracle API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": ["/detect", "/detect/batch", "/detect/url", "/stream", "/health"],
    }
