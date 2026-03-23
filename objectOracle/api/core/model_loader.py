"""
api/core/model_loader.py
Singleton loader for YOLOv8, CLIP, and SAM models.
Models are loaded once on startup and reused across requests.
"""
from __future__ import annotations
import threading
from pathlib import Path
from loguru import logger
from .config import settings


class ModelRegistry:
    """Thread-safe singleton model registry."""

    _instance: ModelRegistry | None = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def initialize(self):
        if self._initialized:
            return
        logger.info("Loading models...")
        self._load_yolo()
        self._load_clip()
        self._load_sam()
        self._initialized = True
        logger.info("All models loaded.")

    # ------------------------------------------------------------------ #
    # YOLOv8
    # ------------------------------------------------------------------ #
    def _load_yolo(self):
        from ultralytics import YOLO
        model_path = settings.yolo_custom_path or settings.yolo_model_path
        logger.info(f"Loading YOLO from {model_path}")
        self.yolo = YOLO(model_path)
        self.yolo.to(settings.device)

    # ------------------------------------------------------------------ #
    # CLIP
    # ------------------------------------------------------------------ #
    def _load_clip(self):
        try:
            import clip
            import torch
            device = settings.device
            logger.info(f"Loading CLIP {settings.clip_model}")
            self.clip_model, self.clip_preprocess = clip.load(
                settings.clip_model, device=device
            )
            self.clip_device = device
        except ImportError:
            logger.warning("openai-clip not installed. CLIP features disabled.")
            self.clip_model = None

    # ------------------------------------------------------------------ #
    # SAM – Segment Anything Model
    # ------------------------------------------------------------------ #
    def _load_sam(self):
        sam_path = Path(settings.sam_checkpoint)
        if not sam_path.exists():
            logger.warning(f"SAM checkpoint not found at {sam_path}. Segmentation disabled.")
            self.sam_predictor = None
            return
        try:
            from segment_anything import sam_model_registry, SamPredictor
            sam = sam_model_registry["vit_b"](checkpoint=str(sam_path))
            sam.to(settings.device)
            self.sam_predictor = SamPredictor(sam)
            logger.info("SAM loaded.")
        except ImportError:
            logger.warning("segment-anything not installed. Segmentation disabled.")
            self.sam_predictor = None


# Global singleton
registry = ModelRegistry()
