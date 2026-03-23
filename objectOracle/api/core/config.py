"""
api/core/config.py
Application settings loaded from environment / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False
    secret_key: str = "changeme"

    # Model paths
    yolo_model_path: str = "models/yolov8n.pt"
    yolo_custom_path: str = ""
    clip_model: str = "ViT-B/32"
    sam_checkpoint: str = "models/sam_vit_b.pth"

    # Inference
    confidence_threshold: float = 0.40
    nms_iou_threshold: float = 0.45
    max_detections: int = 100
    device: str = "cpu"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Logging
    log_level: str = "INFO"

    @property
    def models_dir(self) -> Path:
        return Path(self.yolo_model_path).parent


settings = Settings()
