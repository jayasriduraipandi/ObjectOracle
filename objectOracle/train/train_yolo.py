"""
train/train_yolo.py
Fine-tune YOLOv8 on a custom dataset.

Usage:
    python train_yolo.py --data data/dataset.yaml --epochs 100 --model yolov8n.pt

Dataset YAML format (data/dataset.yaml):
    path: /path/to/dataset
    train: images/train
    val:   images/val
    nc:    80
    names: [person, car, ...]
"""
import argparse
from pathlib import Path
from ultralytics import YOLO
import wandb


def parse_args():
    parser = argparse.ArgumentParser(description="Train YOLOv8 for ObjectOracle")
    parser.add_argument("--data",    default="data/dataset.yaml", help="Dataset YAML")
    parser.add_argument("--model",   default="yolov8n.pt",        help="Base model")
    parser.add_argument("--epochs",  type=int, default=100)
    parser.add_argument("--imgsz",   type=int, default=640)
    parser.add_argument("--batch",   type=int, default=16)
    parser.add_argument("--device",  default="0",                 help="cuda device or 'cpu'")
    parser.add_argument("--project", default="runs/train")
    parser.add_argument("--name",    default="objectOracle")
    parser.add_argument("--wandb",   action="store_true",         help="Enable W&B logging")
    return parser.parse_args()


def main():
    args = parse_args()

    if args.wandb:
        wandb.init(project="objectOracle", config=vars(args))

    print(f"Loading base model: {args.model}")
    model = YOLO(args.model)

    print(f"Training on: {args.data}")
    results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=args.project,
        name=args.name,
        # Augmentation
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        flipud=0.0,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,
        # Optimizer
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        # Early stopping
        patience=20,
        # Logging
        plots=True,
        save=True,
        save_period=10,
    )

    # Export to ONNX for edge deployment
    best_model_path = Path(args.project) / args.name / "weights" / "best.pt"
    if best_model_path.exists():
        print(f"\nExporting best model to ONNX: {best_model_path}")
        best = YOLO(str(best_model_path))
        best.export(format="onnx", imgsz=args.imgsz, dynamic=True)
        print("ONNX export complete.")

    if args.wandb:
        wandb.finish()

    print(f"\nTraining complete. Results saved to {args.project}/{args.name}")
    return results


if __name__ == "__main__":
    main()
