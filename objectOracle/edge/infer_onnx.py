"""
edge/infer_onnx.py
Lightweight ONNX inference for edge devices (Jetson Nano, Raspberry Pi 4).
No PyTorch required at runtime — only onnxruntime + OpenCV + NumPy.

Usage:
    python infer_onnx.py --model models/yolov8n.onnx --source image.jpg
    python infer_onnx.py --model models/yolov8n.onnx --source 0   # webcam
"""
from __future__ import annotations
import argparse
import time
import cv2
import numpy as np

try:
    import onnxruntime as ort
except ImportError:
    raise SystemExit("Install onnxruntime: pip install onnxruntime")

COCO_CLASSES = [
    "person","bicycle","car","motorcycle","airplane","bus","train","truck","boat",
    "traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat",
    "dog","horse","sheep","cow","elephant","bear","zebra","giraffe","backpack",
    "umbrella","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball",
    "kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket",
    "bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple",
    "sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair",
    "couch","potted plant","bed","dining table","toilet","tv","laptop","mouse",
    "remote","keyboard","cell phone","microwave","oven","toaster","sink","refrigerator",
    "book","clock","vase","scissors","teddy bear","hair drier","toothbrush",
]

COLORS = np.random.default_rng(42).uniform(0, 255, size=(len(COCO_CLASSES), 3))


class ONNXDetector:
    def __init__(self, model_path: str, confidence: float = 0.4, iou: float = 0.45):
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        self.session = ort.InferenceSession(model_path, providers=providers)
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape  # [1, 3, H, W]
        self.img_size = self.input_shape[2]  # assume square
        self.confidence = confidence
        self.iou = iou

    def preprocess(self, frame: np.ndarray) -> tuple[np.ndarray, float, float]:
        h, w = frame.shape[:2]
        scale = self.img_size / max(h, w)
        new_h, new_w = int(h * scale), int(w * scale)
        resized = cv2.resize(frame, (new_w, new_h))
        pad_h = self.img_size - new_h
        pad_w = self.img_size - new_w
        padded = cv2.copyMakeBorder(resized, 0, pad_h, 0, pad_w, cv2.BORDER_CONSTANT, value=114)
        blob = padded[:, :, ::-1].transpose(2, 0, 1).astype(np.float32) / 255.0
        return blob[np.newaxis], scale, (pad_h, pad_w)

    def postprocess(self, output: np.ndarray, scale: float, pads: tuple, orig_shape: tuple):
        pred = output[0].T  # [num_preds, 4 + num_classes]
        boxes = pred[:, :4]
        scores = pred[:, 4:].max(axis=1)
        class_ids = pred[:, 4:].argmax(axis=1)

        mask = scores > self.confidence
        boxes, scores, class_ids = boxes[mask], scores[mask], class_ids[mask]

        # xywh → xyxy
        x1 = boxes[:, 0] - boxes[:, 2] / 2
        y1 = boxes[:, 1] - boxes[:, 3] / 2
        x2 = boxes[:, 0] + boxes[:, 2] / 2
        y2 = boxes[:, 1] + boxes[:, 3] / 2

        # Scale back to original image
        pad_h, pad_w = pads
        x1 = (x1 / scale).clip(0, orig_shape[1])
        y1 = (y1 / scale).clip(0, orig_shape[0])
        x2 = (x2 / scale).clip(0, orig_shape[1])
        y2 = (y2 / scale).clip(0, orig_shape[0])

        indices = cv2.dnn.NMSBoxes(
            np.stack([x1, y1, x2 - x1, y2 - y1], axis=1).tolist(),
            scores.tolist(), self.confidence, self.iou
        )

        results = []
        for i in (indices.flatten() if len(indices) > 0 else []):
            results.append({
                "label": COCO_CLASSES[class_ids[i]],
                "confidence": round(float(scores[i]), 3),
                "bbox": [int(x1[i]), int(y1[i]), int(x2[i]), int(y2[i])],
            })
        return results

    def detect(self, frame: np.ndarray) -> tuple[list, float]:
        blob, scale, pads = self.preprocess(frame)
        t0 = time.perf_counter()
        outputs = self.session.run(None, {self.input_name: blob})
        ms = (time.perf_counter() - t0) * 1000
        results = self.postprocess(outputs[0], scale, pads, frame.shape)
        return results, round(ms, 1)


def draw_boxes(frame: np.ndarray, detections: list):
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        cls = COCO_CLASSES.index(det["label"]) if det["label"] in COCO_CLASSES else 0
        color = tuple(COLORS[cls].tolist())
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        label = f"{det['label']} {det['confidence']:.2f}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(frame, (x1, y1 - th - 6), (x1 + tw + 4, y1), color, -1)
        cv2.putText(frame, label, (x1 + 2, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    return frame


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model",      required=True)
    parser.add_argument("--source",     default="0")
    parser.add_argument("--confidence", type=float, default=0.4)
    parser.add_argument("--iou",        type=float, default=0.45)
    parser.add_argument("--show",       action="store_true", default=True)
    args = parser.parse_args()

    detector = ONNXDetector(args.model, args.confidence, args.iou)

    source = int(args.source) if args.source.isdigit() else args.source
    cap = cv2.VideoCapture(source)

    print(f"ObjectOracle Edge | Model: {args.model} | Source: {args.source}")
    print("Press 'q' to quit.")

    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        detections, ms = detector.detect(frame)
        frame_count += 1

        if args.show:
            annotated = draw_boxes(frame.copy(), detections)
            cv2.putText(annotated, f"{ms:.1f}ms | {len(detections)} obj",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.imshow("ObjectOracle Edge", annotated)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        else:
            print(f"Frame {frame_count} | {ms:.1f}ms | {detections}")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
