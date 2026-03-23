"""
objectOracle_client.py
Simple Python client for the ObjectOracle API.
Can be used standalone or imported as a library.

Usage:
    from objectOracle_client import ObjectOracleClient

    client = ObjectOracleClient("http://localhost:8000")

    # Detect from file
    result = client.detect_file("photo.jpg", confidence=0.5)
    print(result.objects)

    # Detect from URL
    result = client.detect_url("https://example.com/photo.jpg")

    # Batch
    results = client.detect_batch(["a.jpg", "b.jpg", "c.jpg"])

    # WebSocket streaming
    import cv2
    client.stream_webcam(camera_index=0)
"""
from __future__ import annotations
import base64
import io
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import httpx


# ─────────────────────────────────────────────────────────────────────────────
# Data classes
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class DetectedObject:
    label: str
    confidence: float
    bbox: tuple[int, int, int, int]   # x1, y1, x2, y2
    class_id: int
    track_id: Optional[int] = None


@dataclass
class SceneTag:
    label: str
    confidence: float


@dataclass
class DetectionResult:
    objects: list[DetectedObject]
    scene_tags: list[SceneTag]
    inference_ms: float
    image_size: dict
    object_count: int = 0

    def __post_init__(self):
        self.object_count = len(self.objects)

    def summary(self) -> str:
        lines = [
            f"ObjectOracle result — {self.object_count} objects in {self.inference_ms}ms",
            f"  Image: {self.image_size['width']}x{self.image_size['height']}",
        ]
        for obj in self.objects:
            lines.append(f"  [{obj.confidence:.0%}] {obj.label:20s}  bbox={obj.bbox}")
        if self.scene_tags:
            lines.append(f"  Scene: {self.scene_tags[0].label} ({self.scene_tags[0].confidence:.0%})")
        return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Client
# ─────────────────────────────────────────────────────────────────────────────

class ObjectOracleClient:
    def __init__(self, base_url: str = "http://localhost:8000", timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(timeout=timeout)

    def _parse(self, data: dict) -> DetectionResult:
        objects = [DetectedObject(**obj) for obj in data.get("objects", [])]
        tags = [SceneTag(**t) for t in data.get("scene_tags", [])]
        return DetectionResult(
            objects=objects,
            scene_tags=tags,
            inference_ms=data["inference_ms"],
            image_size=data["image_size"],
        )

    def health(self) -> dict:
        return self.client.get(f"{self.base_url}/health").json()

    def detect_file(
        self,
        path: str | Path,
        confidence: float = None,
        scene: bool = True,
        segmentation: bool = False,
    ) -> DetectionResult:
        path = Path(path)
        params = {"scene": scene, "segmentation": segmentation}
        if confidence:
            params["confidence"] = confidence

        with open(path, "rb") as f:
            r = self.client.post(
                f"{self.base_url}/detect",
                params=params,
                files={"file": (path.name, f, "image/jpeg")},
            )
        r.raise_for_status()
        return self._parse(r.json())

    def detect_url(self, url: str, confidence: float = None) -> DetectionResult:
        params = {"url": url}
        if confidence:
            params["confidence"] = confidence
        r = self.client.post(f"{self.base_url}/detect/url", params=params)
        r.raise_for_status()
        return self._parse(r.json())

    def detect_batch(
        self,
        paths: list[str | Path],
        confidence: float = None,
    ) -> list[DetectionResult]:
        files = []
        for p in paths:
            p = Path(p)
            files.append(("files", (p.name, open(p, "rb"), "image/jpeg")))
        params = {}
        if confidence:
            params["confidence"] = confidence

        r = self.client.post(f"{self.base_url}/detect/batch", files=files, params=params)
        r.raise_for_status()
        return [self._parse(item) for item in r.json()["results"]]

    def stream_webcam(self, camera_index: int = 0, confidence: float = 0.4):
        """
        Stream webcam frames to ObjectOracle over WebSocket.
        Displays annotated output with OpenCV. Press 'q' to quit.
        """
        try:
            import cv2
            import websocket
        except ImportError:
            raise SystemExit("Install: pip install opencv-python websocket-client")

        ws_url = self.base_url.replace("http", "ws") + "/stream"
        result_holder: list[dict] = [{}]

        def on_message(ws, msg):
            result_holder[0] = json.loads(msg)

        ws = websocket.WebSocketApp(ws_url, on_message=on_message)
        import threading
        t = threading.Thread(target=ws.run_forever, daemon=True)
        t.start()

        cap = cv2.VideoCapture(camera_index)
        print(f"Streaming webcam → {ws_url}. Press 'q' to quit.")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Encode and send frame
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            b64 = base64.b64encode(buf.tobytes()).decode()
            try:
                ws.send(json.dumps({"frame": b64, "confidence": confidence}))
            except Exception:
                pass

            # Draw detections from last result
            r = result_holder[0]
            for obj in r.get("objects", []):
                x1, y1, x2, y2 = obj["bbox"]
                cv2.rectangle(frame, (x1, y1), (x2, y2), (124, 109, 245), 2)
                label = f"{obj['label']} {int(obj['confidence']*100)}%"
                cv2.putText(frame, label, (x1, y1 - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (124, 109, 245), 1)

            ms = r.get("inference_ms", 0)
            cv2.putText(frame, f"{ms}ms", (10, 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (34, 211, 165), 2)
            cv2.imshow("ObjectOracle Stream", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        cap.release()
        cv2.destroyAllWindows()
        ws.close()


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ObjectOracle Python Client")
    parser.add_argument("--api",        default="http://localhost:8000")
    parser.add_argument("--file",       help="Image path to detect")
    parser.add_argument("--url",        help="Image URL to detect")
    parser.add_argument("--webcam",     action="store_true")
    parser.add_argument("--confidence", type=float, default=0.4)
    parser.add_argument("--health",     action="store_true")
    args = parser.parse_args()

    client = ObjectOracleClient(args.api)

    if args.health:
        print(json.dumps(client.health(), indent=2))
    elif args.file:
        result = client.detect_file(args.file, confidence=args.confidence)
        print(result.summary())
    elif args.url:
        result = client.detect_url(args.url, confidence=args.confidence)
        print(result.summary())
    elif args.webcam:
        client.stream_webcam(confidence=args.confidence)
    else:
        parser.print_help()
