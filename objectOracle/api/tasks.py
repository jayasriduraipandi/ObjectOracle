"""
api/tasks.py
Celery async task definitions for batch detection jobs.
"""
from celery import Celery
from .core.config import settings

app = Celery("objectOracle", broker=settings.redis_url, backend=settings.redis_url)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
    result_expires=3600,  # Results expire after 1 hour
)


@app.task(bind=True, name="detect_image_task")
def detect_image_task(self, image_bytes_b64: str, options: dict) -> dict:
    """
    Async detection task for large batch jobs.

    Parameters
    ----------
    image_bytes_b64 : base64-encoded image bytes
    options         : dict with keys confidence, scene, segmentation

    Returns
    -------
    Full detection result dict
    """
    import base64
    import io
    from PIL import Image
    from .core.inference import run_full_pipeline

    self.update_state(state="PROCESSING", meta={"progress": 10})

    data = base64.b64decode(image_bytes_b64)
    image = Image.open(io.BytesIO(data)).convert("RGB")

    self.update_state(state="PROCESSING", meta={"progress": 50})

    result = run_full_pipeline(
        image,
        include_scene=options.get("scene", True),
        include_segmentation=options.get("segmentation", False),
        confidence=options.get("confidence"),
    )

    self.update_state(state="PROCESSING", meta={"progress": 100})
    return result
