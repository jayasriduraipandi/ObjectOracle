"""
edge/export_onnx.py
Export a trained YOLOv8 .pt model to ONNX format for edge deployment.
Optionally quantize to INT8 for faster inference on CPU.

Usage:
    python export_onnx.py --model models/yolov8n.pt
    python export_onnx.py --model models/best.pt --quantize --imgsz 416
"""
import argparse
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model",    required=True, help=".pt model path")
    parser.add_argument("--imgsz",   type=int, default=640)
    parser.add_argument("--dynamic",  action="store_true", default=True)
    parser.add_argument("--simplify", action="store_true", default=True)
    parser.add_argument("--quantize", action="store_true", help="INT8 quantization")
    return parser.parse_args()


def main():
    args = parse_args()
    from ultralytics import YOLO

    model_path = Path(args.model)
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")

    model = YOLO(str(model_path))

    print(f"Exporting {model_path.name} → ONNX (imgsz={args.imgsz})")
    export_path = model.export(
        format="onnx",
        imgsz=args.imgsz,
        dynamic=args.dynamic,
        simplify=args.simplify,
        opset=12,
    )
    print(f"ONNX saved: {export_path}")

    if args.quantize:
        _quantize_onnx(export_path)


def _quantize_onnx(onnx_path: str):
    try:
        from onnxruntime.quantization import quantize_dynamic, QuantType
        import onnx
    except ImportError:
        print("Install onnxruntime for quantization: pip install onnxruntime")
        return

    out_path = str(onnx_path).replace(".onnx", "_int8.onnx")
    print(f"Quantizing to INT8: {out_path}")
    quantize_dynamic(
        model_input=onnx_path,
        model_output=out_path,
        weight_type=QuantType.QUInt8,
    )
    print(f"INT8 model saved: {out_path}")


if __name__ == "__main__":
    main()
