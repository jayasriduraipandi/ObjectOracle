#!/usr/bin/env python3
"""
scripts/download_models.py
Download all required model weights before first run.

Usage:
    python scripts/download_models.py
    python scripts/download_models.py --skip-sam   # skip large SAM checkpoint
"""
import argparse
import urllib.request
import os
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent / "models"

DOWNLOADS = {
    "yolov8n.pt": "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt",
    "yolov8s.pt": "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8s.pt",
    "sam_vit_b.pth": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth",
}


def download_file(url: str, dest: Path):
    if dest.exists():
        print(f"  [skip] {dest.name} already exists")
        return
    print(f"  Downloading {dest.name} ...")

    def progress(count, block_size, total_size):
        pct = count * block_size * 100 // total_size
        print(f"\r  {pct}%", end="", flush=True)

    urllib.request.urlretrieve(url, dest, reporthook=progress)
    print(f"\r  Done: {dest.name} ({dest.stat().st_size // 1024 // 1024} MB)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-sam", action="store_true", help="Skip SAM (2.4 GB)")
    args = parser.parse_args()

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading models to {MODELS_DIR}\n")

    for name, url in DOWNLOADS.items():
        if args.skip_sam and "sam" in name:
            print(f"  [skip] {name} (--skip-sam)")
            continue
        download_file(url, MODELS_DIR / name)

    print("\nAll downloads complete. You're ready to run ObjectOracle!")
    print("  Start API:   cd api && uvicorn main:app --reload")
    print("  Start UI:    cd frontend && npm run dev")


if __name__ == "__main__":
    main()
