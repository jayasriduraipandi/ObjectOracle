"""
train/evaluate.py
Evaluate a trained YOLOv8 model on a validation/test dataset.
Reports mAP50, mAP50-95, precision, recall per class.

Usage:
    python evaluate.py --model runs/train/objectOracle/weights/best.pt \
                       --data data/dataset.yaml
"""
import argparse
import json
from pathlib import Path
from ultralytics import YOLO


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model",  required=True, help="Path to .pt model")
    parser.add_argument("--data",   required=True, help="Dataset YAML")
    parser.add_argument("--split",  default="val", choices=["val", "test"])
    parser.add_argument("--imgsz",  type=int, default=640)
    parser.add_argument("--device", default="0")
    parser.add_argument("--out",    default="eval_results.json")
    return parser.parse_args()


def main():
    args = parse_args()
    model = YOLO(args.model)

    metrics = model.val(
        data=args.data,
        split=args.split,
        imgsz=args.imgsz,
        device=args.device,
        plots=True,
        save_json=True,
    )

    results = {
        "model": args.model,
        "dataset": args.data,
        "split": args.split,
        "mAP50":    round(float(metrics.box.map50),  4),
        "mAP50-95": round(float(metrics.box.map),    4),
        "precision": round(float(metrics.box.mp),    4),
        "recall":    round(float(metrics.box.mr),    4),
        "per_class": {
            name: {
                "mAP50":    round(float(metrics.box.ap50[i]),  4),
                "mAP50-95": round(float(metrics.box.ap[i]),    4),
            }
            for i, name in enumerate(model.names.values())
        },
    }

    print("\n─── Evaluation Results ───")
    print(f"  mAP50:     {results['mAP50']:.4f}")
    print(f"  mAP50-95:  {results['mAP50-95']:.4f}")
    print(f"  Precision: {results['precision']:.4f}")
    print(f"  Recall:    {results['recall']:.4f}")

    out = Path(args.out)
    out.write_text(json.dumps(results, indent=2))
    print(f"\nResults saved to {out}")


if __name__ == "__main__":
    main()
