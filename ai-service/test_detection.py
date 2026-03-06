import os
from pathlib import Path

import cv2
from ultralytics import YOLO


DATASET_PATH = Path(__file__).resolve().parent / "datasets" / "test_images"
MODEL_PATH = Path(__file__).resolve().parent / "yolov8m.pt"
FALLBACK_MODEL_PATH = Path(__file__).resolve().parent / "yolov8n.pt"
CONFIDENCE = 0.25
VEHICLE_CLASSES = {"car", "bus", "truck", "motorbike", "motorcycle", "bicycle"}


def normalize_label(label: str) -> str:
    return "motorbike" if label == "motorcycle" else label


def parse_detections(model: YOLO, results):
    detections = []
    for r in results:
        if r.boxes is None:
            continue
        for box in r.boxes:
            cls_id = int(box.cls.item())
            names = model.names
            if isinstance(names, dict):
                label = names.get(cls_id, str(cls_id))
            else:
                label = names[cls_id] if 0 <= cls_id < len(names) else str(cls_id)
            detections.append(
                {
                    "label": normalize_label(label),
                    "confidence": float(box.conf.item()),
                }
            )
    return detections


def validate_model(model: YOLO):
    """Validate model with a reference dataset image."""
    sample = DATASET_PATH / "street1.jpg"
    if not sample.exists():
        return []

    img = cv2.imread(str(sample))
    if img is None:
        return []

    img = cv2.resize(img, (640, 640))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = model(img, conf=CONFIDENCE, verbose=False)
    detections = parse_detections(model, results)
    return [d["label"] for d in detections]


def main():
    print("Loading YOLO model...")
    if MODEL_PATH.exists():
        model = YOLO(str(MODEL_PATH))
        print(f"Using model: {MODEL_PATH.name}")
    else:
        model = YOLO(str(FALLBACK_MODEL_PATH))
        print(f"Using fallback model: {FALLBACK_MODEL_PATH.name}")
    print("Model loaded successfully")

    if not DATASET_PATH.exists():
        print(f"Dataset path missing: {DATASET_PATH}")
        return

    validation_objects = validate_model(model)
    print("Validation objects from street1.jpg:", validation_objects)
    if not validation_objects:
        print("WARNING: validate_model() returned empty detections")

    for image_name in sorted(os.listdir(DATASET_PATH)):
        image_path = DATASET_PATH / image_name
        if not image_path.is_file():
            continue

        frame = cv2.imread(str(image_path))
        if frame is None:
            print("Skipping unreadable image:", image_name)
            continue

        frame = cv2.resize(frame, (640, 640))
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = model(frame, conf=CONFIDENCE, verbose=False)
        detections = parse_detections(model, results)

        labels = [d["label"] for d in detections]
        people_count = sum(1 for label in labels if label == "person")
        vehicle_count = sum(1 for label in labels if label in VEHICLE_CLASSES)

        if people_count <= 3:
            density_level = "LOW"
        elif people_count <= 10:
            density_level = "MEDIUM"
        else:
            density_level = "HIGH"

        print("\nProcessing:", image_name)
        print("Detected objects:", labels)
        print("Detected:", labels)
        print("People:", people_count)
        print("Vehicles:", vehicle_count)
        print("Density:", density_level)


if __name__ == "__main__":
    main()
