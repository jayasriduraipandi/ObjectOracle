"""
api/core/inference.py
Core inference logic: detection (YOLO), scene classification (CLIP),
segmentation (SAM), and post-processing (NMS, tracking).
"""
from __future__ import annotations
import time
import numpy as np
from PIL import Image
from loguru import logger

from .config import settings
from .model_loader import registry


# ─────────────────────────────────────────────────────────────────────────────
# Scene tags for CLIP zero-shot classification
# ─────────────────────────────────────────────────────────────────────────────
SCENE_PROMPTS = [
    "a photo of an urban street",
    "a photo of a highway",
    "a photo of an indoor room",
    "a photo of a park or garden",
    "a photo of a shopping mall",
    "a photo of a parking lot",
    "a photo of an office",
    "a photo of a construction site",
    "a photo of a beach or coastline",
    "a photo of a forest or nature",
]

SCENE_LABELS = [
    "Urban street", "Highway", "Indoor room", "Park / Garden",
    "Shopping mall", "Parking lot", "Office", "Construction site",
    "Beach", "Nature / Forest",
]


# ─────────────────────────────────────────────────────────────────────────────
# Detection
# ─────────────────────────────────────────────────────────────────────────────
def run_detection(
    image: Image.Image,
    confidence: float = None,
    iou: float = None,
    max_det: int = None,
) -> dict:
    """
    Run YOLOv8 object detection on a PIL image.

    Returns
    -------
    dict with keys: objects, inference_ms, image_size
    """
    conf = confidence or settings.confidence_threshold
    iou_ = iou or settings.nms_iou_threshold
    max_d = max_det or settings.max_detections

    start = time.perf_counter()

    results = registry.yolo.predict(
        source=image,
        conf=conf,
        iou=iou_,
        max_det=max_d,
        verbose=False,
    )

    inference_ms = round((time.perf_counter() - start) * 1000, 1)

    objects = []
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            objects.append(
                {
                    "label": registry.yolo.names[int(box.cls)],
                    "confidence": round(float(box.conf), 4),
                    "bbox": [round(x1), round(y1), round(x2), round(y2)],
                    "class_id": int(box.cls),
                }
            )

    return {
        "objects": objects,
        "inference_ms": inference_ms,
        "image_size": {"width": image.width, "height": image.height},
    }


# ─────────────────────────────────────────────────────────────────────────────
# Scene Classification (CLIP)
# ─────────────────────────────────────────────────────────────────────────────
def run_scene_classification(image: Image.Image, top_k: int = 3) -> list[dict]:
    """
    Zero-shot scene classification using CLIP.

    Returns top_k scene labels with their confidence scores.
    """
    if registry.clip_model is None:
        return [{"label": "Unknown", "confidence": 0.0}]

    import clip
    import torch

    img_tensor = registry.clip_preprocess(image).unsqueeze(0).to(registry.clip_device)
    text_tokens = clip.tokenize(SCENE_PROMPTS).to(registry.clip_device)

    with torch.no_grad():
        logits_per_image, _ = registry.clip_model(img_tensor, text_tokens)
        probs = logits_per_image.softmax(dim=-1).cpu().numpy()[0]

    top_indices = probs.argsort()[::-1][:top_k]
    return [
        {"label": SCENE_LABELS[i], "confidence": round(float(probs[i]), 4)}
        for i in top_indices
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Segmentation (SAM)
# ─────────────────────────────────────────────────────────────────────────────
def run_segmentation(image: Image.Image, boxes: list[list[int]]) -> list[dict]:
    """
    Run SAM segmentation for each bounding box.

    Parameters
    ----------
    boxes : list of [x1, y1, x2, y2] bounding boxes

    Returns
    -------
    list of dicts with 'mask_rle' (run-length encoded mask) and 'area'
    """
    if registry.sam_predictor is None or not boxes:
        return []

    import torch
    import numpy as np

    img_array = np.array(image.convert("RGB"))
    registry.sam_predictor.set_image(img_array)

    results = []
    for box in boxes:
        box_array = np.array(box)
        masks, scores, _ = registry.sam_predictor.predict(
            box=box_array,
            multimask_output=False,
        )
        mask = masks[0].astype(bool)
        results.append(
            {
                "mask_shape": list(mask.shape),
                "area": int(mask.sum()),
                "score": round(float(scores[0]), 4),
                # For full mask data, clients can request base64 encoded mask
                "mask_preview": None,
            }
        )

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Full pipeline
# ─────────────────────────────────────────────────────────────────────────────
def run_full_pipeline(
    image: Image.Image,
    include_scene: bool = True,
    include_segmentation: bool = False,
    confidence: float = None,
) -> dict:
    """
    Run the complete ObjectOracle pipeline:
    1. YOLOv8 detection
    2. CLIP scene classification
    3. Optional SAM segmentation
    """
    detection = run_detection(image, confidence=confidence)
    scene_tags = run_scene_classification(image) if include_scene else []

    segmentation = []
    if include_segmentation and detection["objects"]:
        boxes = [obj["bbox"] for obj in detection["objects"]]
        segmentation = run_segmentation(image, boxes)

    return {
        **detection,
        "scene_tags": scene_tags,
        "segmentation": segmentation,
    }
