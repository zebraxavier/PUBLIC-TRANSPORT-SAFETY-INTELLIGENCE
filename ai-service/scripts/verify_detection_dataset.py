"""
Dataset verification for YOLOv8 detection pipeline.

Usage:
  cd ai-service
  .venv\\Scripts\\python.exe scripts\\verify_detection_dataset.py
"""

from pathlib import Path
import cv2
try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
VEHICLE_CLASSES = {"car", "bus", "truck", "motorbike", "motorcycle", "bicycle"}


def normalize_label(label: str) -> str:
    return "motorbike" if label == "motorcycle" else label


def parse_detections(model: YOLO, results):
    detections = []
    for r in results:
        boxes = r.boxes
        if boxes is None:
            continue
        for box in boxes:
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


def run_on_image(model: YOLO, image_path: Path):
    frame = cv2.imread(str(image_path))
    if frame is None:
        return None
    frame = cv2.resize(frame, (640, 640))
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = model(frame, conf=0.25, verbose=False)
    detections = parse_detections(model, results)
    people_count = sum(1 for d in detections if d["label"] == "person")
    vehicle_count = sum(1 for d in detections if d["label"] in VEHICLE_CLASSES)
    return {
        "path": str(image_path),
        "detections": detections,
        "people_count": people_count,
        "vehicle_count": vehicle_count,
    }


def collect_dataset_images(root: Path):
    test_images = root / "test_images"
    images = []
    if test_images.exists():
        images.extend(
            [p for p in test_images.rglob("*") if p.suffix.lower() in IMAGE_EXTS]
        )

    # Fallback reference image from ultralytics package assets, if available.
    ultra_assets = root / ".venv" / "Lib" / "site-packages" / "ultralytics" / "assets"
    if ultra_assets.exists():
        images.extend(
            [p for p in ultra_assets.rglob("*") if p.suffix.lower() in IMAGE_EXTS]
        )

    # Deduplicate while preserving order.
    seen = set()
    unique = []
    for p in images:
        sp = str(p.resolve())
        if sp not in seen:
            seen.add(sp)
            unique.append(p)
    return unique


def main():
    if YOLO is None:
        print("ultralytics is not installed in ai-service/.venv")
        print("Install with: .venv\\Scripts\\python.exe -m pip install ultralytics")
        return

    root = Path(__file__).resolve().parents[1]
    print("Loading model yolov8n.pt ...")
    model = YOLO("yolov8n.pt")
    print("Model loaded successfully")

    images = collect_dataset_images(root)
    if not images:
        print("No dataset images found.")
        print("Add reference images under ai-service/test_images and rerun.")
        return

    print(f"Found {len(images)} image(s). Running verification...")
    total_people = 0
    total_vehicles = 0
    detected_labels = set()

    for img in images:
        out = run_on_image(model, img)
        if out is None:
            print(f"[SKIP] Could not read image: {img}")
            continue
        labels = [d["label"] for d in out["detections"]]
        detected_labels.update(labels)
        total_people += out["people_count"]
        total_vehicles += out["vehicle_count"]
        print(f"\nImage: {out['path']}")
        print("Detections:", out["detections"])
        print("People:", out["people_count"])
        print("Vehicles:", out["vehicle_count"])

    print("\n=== SUMMARY ===")
    print("Detected labels:", sorted(detected_labels))
    print("Total people:", total_people)
    print("Total vehicles:", total_vehicles)
    print(
        "Required classes present check:",
        {
            "person": "person" in detected_labels,
            "car": "car" in detected_labels,
            "bus": "bus" in detected_labels,
            "truck": "truck" in detected_labels,
            "motorbike": "motorbike" in detected_labels,
            "bicycle": "bicycle" in detected_labels,
        },
    )


if __name__ == "__main__":
    main()
