"""
api/main.py
ObjectOracle FastAPI application entrypoint.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from core.config import settings
from core.model_loader import registry
from routes.detect import router as detect_router
from routes.stream import router as stream_router
from routes.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, clean up on shutdown."""
    logger.info("ObjectOracle API starting up...")
    registry.initialize()
    yield
    logger.info("ObjectOracle API shutting down.")


app = FastAPI(
    title="ObjectOracle API",
    description=(
        "Real-time scene understanding & object detection.\n\n"
        "- **YOLOv8** — fast object detection with bounding boxes\n"
        "- **CLIP** — zero-shot scene classification\n"
        "- **SAM** — pixel-level instance segmentation\n"
        "- **WebSocket /stream** — real-time frame-by-frame detection"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(detect_router)
app.include_router(stream_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
