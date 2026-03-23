"""
api/routes/stream.py
WebSocket endpoint for real-time video frame detection streaming.

Client sends base64-encoded JPEG frames; server replies with JSON detections.

Protocol:
  Client → { "frame": "<base64 jpeg>", "confidence": 0.4 }
  Server → { "objects": [...], "scene_tags": [...], "inference_ms": 18 }
"""
from __future__ import annotations
import base64
import io
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from PIL import Image
from loguru import logger

from ..core.inference import run_full_pipeline

router = APIRouter(tags=["streaming"])


@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    """
    Real-time frame-by-frame detection over WebSocket.
    Accepts base64-encoded JPEG frames and returns detection JSON.
    """
    await websocket.accept()
    logger.info(f"WebSocket client connected: {websocket.client}")

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON payload"})
                continue

            frame_b64 = payload.get("frame")
            if not frame_b64:
                await websocket.send_json({"error": "Missing 'frame' field"})
                continue

            try:
                frame_bytes = base64.b64decode(frame_b64)
                image = Image.open(io.BytesIO(frame_bytes)).convert("RGB")
            except Exception as e:
                await websocket.send_json({"error": f"Invalid frame: {e}"})
                continue

            confidence = payload.get("confidence", None)
            include_scene = payload.get("scene", True)

            result = run_full_pipeline(
                image,
                include_scene=include_scene,
                include_segmentation=False,  # too slow for real-time
                confidence=confidence,
            )

            await websocket.send_json(result)

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1011)
