"""
api/core/tasks.py
Celery async tasks for large batch detection jobs.
Allows submitting many images without blocking the HTTP request.

Usage:
    from core.tasks import detect_batch_task
    task = detect_batch_task.delay(["path/to/img1.jpg", "path/to/img2.jpg"])
    result = task.get(timeout=120)
"""
from __future__ import annotations
import base64
import io
from pathlib import Path

from celery import Celery
from loguru import logger

from .config import settings

celery_app = Celery(
    "objectOracle",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    result_expires=3600,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


@celery_app.task(name="detect_file", bind=True, max_retries=2)
def detect_file_task(self, file_path: str, confidence: float = None):
    """
    Detect objects in a file at the given path.
    Returns a dict with detection results.
    """
    try:
        from PIL import Image
        from .inference import run_full_pipeline
        from .model_loader import registry

        # Ensure models loaded (workers share process)
        if not registry._initialized:
            registry.initialize()

        image = Image.open(file_path).convert("RGB")
        result = run_full_pipeline(image, confidence=confidence)
        return {"status": "ok", "file": file_path, "result": result}

    except Exception as exc:
        logger.error(f"Task failed for {file_path}: {exc}")
        self.retry(exc=exc, countdown=5)


@celery_app.task(name="detect_batch")
def detect_batch_task(file_paths: list[str], confidence: float = None):
    """
    Detect objects in a list of image file paths.
    Returns list of detection results.
    """
    from PIL import Image
    from .inference import run_full_pipeline
    from .model_loader import registry

    if not registry._initialized:
        registry.initialize()

    results = []
    for path in file_paths:
        try:
            image = Image.open(path).convert("RGB")
            result = run_full_pipeline(image, confidence=confidence)
            results.append({"file": path, "status": "ok", **result})
        except Exception as e:
            results.append({"file": path, "status": "error", "error": str(e)})
            logger.warning(f"Batch task failed for {path}: {e}")

    return results
