"""
api/routes/batch.py
Async batch detection endpoints using Celery.
Submit a job → get a task ID → poll for results.
"""
from __future__ import annotations
import os
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from loguru import logger

router = APIRouter(prefix="/batch", tags=["batch"])

UPLOAD_DIR = Path("/tmp/objectOracle_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/submit", summary="Submit async batch detection job")
async def submit_batch(files: list[UploadFile] = File(...)):
    """
    Upload multiple images and start an async detection job.
    Returns a task_id to poll for results via GET /batch/status/{task_id}.
    """
    if len(files) > 100:
        raise HTTPException(400, "Maximum 100 images per batch job.")

    try:
        from core.tasks import detect_batch_task
    except ImportError:
        raise HTTPException(503, "Celery/Redis not configured.")

    # Save uploaded files to temp dir
    job_dir = UPLOAD_DIR / str(uuid.uuid4())
    job_dir.mkdir()
    file_paths = []

    for file in files:
        dest = job_dir / file.filename
        content = await file.read()
        dest.write_bytes(content)
        file_paths.append(str(dest))

    task = detect_batch_task.delay(file_paths)
    logger.info(f"Batch job submitted: {task.id} ({len(file_paths)} images)")

    return {"task_id": task.id, "image_count": len(file_paths), "status": "queued"}


@router.get("/status/{task_id}", summary="Poll batch job status")
def get_batch_status(task_id: str):
    """
    Poll the status of a submitted batch detection job.
    States: PENDING → STARTED → SUCCESS | FAILURE
    """
    try:
        from core.tasks import celery_app
        task = celery_app.AsyncResult(task_id)
    except ImportError:
        raise HTTPException(503, "Celery not configured.")

    if task.state == "PENDING":
        return {"task_id": task_id, "status": "pending"}
    elif task.state == "STARTED":
        return {"task_id": task_id, "status": "running"}
    elif task.state == "SUCCESS":
        results = task.result
        return {
            "task_id": task_id,
            "status": "complete",
            "total_images": len(results),
            "total_objects": sum(len(r.get("objects", [])) for r in results),
            "results": results,
        }
    elif task.state == "FAILURE":
        return {"task_id": task_id, "status": "failed", "error": str(task.result)}
    else:
        return {"task_id": task_id, "status": task.state.lower()}
