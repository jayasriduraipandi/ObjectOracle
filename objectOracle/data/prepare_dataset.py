"""
data/prepare_dataset.py
Download and prepare the COCO dataset (or a custom subset) for YOLOv8 training.

Usage:
    # Download COCO val split (small, for testing)
    python prepare_dataset.py --split val2017 --classes person car bicycle

    # Download full COCO train+val
    python prepare_dataset.py --split all

    # Convert a custom labeled dataset (Label Studio export)
    python prepare_dataset.py --labelstudio export.json --out data/custom
"""
import argparse
import json
import os
import shutil
import urllib.request
from pathlib import Path
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# COCO class names (80 classes)
# ─────────────────────────────────────────────────────────────────────────────
COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
    "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
    "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
    "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
    "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush",
]


def create_dataset_yaml(
    root: Path,
    class_names: list[str],
    out_path: Path,
):
    """Write a YOLOv8-compatible dataset.yaml."""
    yaml_content = f"""# ObjectOracle dataset config
path: {root.resolve()}
train: images/train
val:   images/val
test:  images/test

nc: {len(class_names)}
names: {class_names}
"""
    out_path.write_text(yaml_content)
    print(f"Dataset YAML written to: {out_path}")


def download_coco_subset(
    out_dir: Path,
    split: str = "val2017",
    classes: Optional[list[str]] = None,
    max_images: int = 1000,
):
    """
    Download a subset of COCO images and annotations, then convert to YOLO format.
    Requires the fiftyone library: pip install fiftyone
    """
    try:
        import fiftyone as fo
        import fiftyone.zoo as foz
    except ImportError:
        print("Install fiftyone to download COCO: pip install fiftyone")
        return

    classes = classes or COCO_CLASSES[:10]  # default top 10 classes
    print(f"Downloading COCO {split} | classes: {classes} | max: {max_images}")

    dataset = foz.load_zoo_dataset(
        "coco-2017",
        split=split.replace("2017", ""),
        label_types=["detections"],
        classes=classes,
        max_samples=max_images,
    )

    # Export to YOLO format
    export_dir = out_dir / "coco_yolo"
    dataset.export(
        export_dir=str(export_dir),
        dataset_type=fo.types.YOLOv5Dataset,
        label_field="ground_truth",
        classes=classes,
    )

    create_dataset_yaml(
        export_dir,
        classes,
        out_dir / "dataset.yaml",
    )

    print(f"COCO subset saved to: {export_dir}")


def convert_labelstudio(json_path: str, out_dir: Path, class_names: list[str]):
    """
    Convert Label Studio JSON export to YOLOv8 format.

    Label Studio export format:
    [
      { "file_upload": "image.jpg", "annotations": [
          { "result": [
              { "value": { "x": 10, "y": 10, "width": 50, "height": 80,
                           "labels": ["person"] } }
          ]}
      ]}
    ]
    """
    data = json.loads(Path(json_path).read_text())
    imgs_dir   = out_dir / "images" / "train"
    labels_dir = out_dir / "labels" / "train"
    imgs_dir.mkdir(parents=True, exist_ok=True)
    labels_dir.mkdir(parents=True, exist_ok=True)

    for item in data:
        filename = Path(item["file_upload"]).name
        stem = Path(filename).stem

        label_lines = []
        for ann in item.get("annotations", []):
            for result in ann.get("result", []):
                v = result.get("value", {})
                labels = v.get("labels", [])
                if not labels:
                    continue
                label = labels[0]
                if label not in class_names:
                    continue

                class_id = class_names.index(label)
                # Label Studio uses % of image dimensions
                cx = (v["x"] + v["width"]  / 2) / 100
                cy = (v["y"] + v["height"] / 2) / 100
                w  = v["width"]  / 100
                h  = v["height"] / 100
                label_lines.append(f"{class_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")

        if label_lines:
            (labels_dir / f"{stem}.txt").write_text("\n".join(label_lines))

    create_dataset_yaml(out_dir, class_names, out_dir / "dataset.yaml")
    print(f"Label Studio export converted. Labels in: {labels_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--split",        default="val2017")
    parser.add_argument("--classes",      nargs="*", default=None)
    parser.add_argument("--max",          type=int, default=1000)
    parser.add_argument("--out",          default="data/dataset")
    parser.add_argument("--labelstudio",  default=None, help="Label Studio JSON export path")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.labelstudio:
        classes = args.classes or COCO_CLASSES
        convert_labelstudio(args.labelstudio, out_dir, classes)
    else:
        download_coco_subset(out_dir, args.split, args.classes, args.max)


if __name__ == "__main__":
    main()
