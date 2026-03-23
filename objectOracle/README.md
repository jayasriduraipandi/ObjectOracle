# ObjectOracle – Scene Understanding & Object Detection

A production-grade AI vision platform for real-time object detection, scene classification,
and instance segmentation using YOLOv8, CLIP, and SAM.

## Features
- Real-time object detection with YOLOv8 (bounding boxes + tracking)
- Zero-shot scene classification with OpenAI CLIP
- Pixel-level segmentation with Meta SAM
- FastAPI REST + WebSocket streaming API
- React dashboard with live annotation overlays
- ONNX edge deployment (Jetson Nano / Raspberry Pi)
- Docker Compose for one-command setup

## Quick Start

```bash
git clone https://github.com/yourname/objectOracle
cd objectOracle
cp .env.example .env
docker-compose up --build
```

API available at http://localhost:8000  
Dashboard at http://localhost:5173

## Manual Setup

### Backend
```bash
cd api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Usage

```bash
# Detect objects in an image
curl -X POST http://localhost:8000/detect \
  -F "file=@image.jpg" | jq .

# Stream detections (WebSocket)
wscat -c ws://localhost:8000/stream
```

## Project Structure

```
objectOracle/
├── api/              FastAPI backend
│   ├── main.py       App entrypoint
│   ├── routes/       Endpoint routers
│   ├── schemas/      Pydantic models
│   └── core/         Config, model loader, utils
├── models/           Model weights + configs
├── train/            Training scripts (YOLOv8 + CLIP)
├── frontend/         React dashboard (Vite)
├── edge/             ONNX export + Jetson scripts
├── data/             Dataset management
├── notebooks/        EDA & evaluation
└── docker-compose.yml
```

## License
MIT
