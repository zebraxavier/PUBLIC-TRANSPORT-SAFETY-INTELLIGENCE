"""
CV Detection Module - YOLOv8/OpenCV detection pipeline.
Uses real YOLO model for object detection with tracking and anomaly detection.
Outputs match the expected schema for the PTSI backend.

FIXED: Added movement detection between frames using OpenCV
FIXED: Added explicit YOLO loading verification and debug logging
"""

import numpy as np
import cv2
import base64
import os
from datetime import datetime
from collections import deque, defaultdict
from typing import Dict, Any, List, Optional
from .tracker import CentroidTracker
from .anomaly import AnomalyDetector

# Try to import YOLO - fall back to simulation if not available
YOLO_AVAILABLE = False
YOLO_LOADED = False
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    print("[OK] Ultralytics package imported successfully")
except ImportError:
    print("[WARNING] Ultralytics not installed. Using simulation mode.")
    print("[WARNING] Install ultralytics: pip install ultralytics")


class TransportDetector:
    """
    Real computer vision detection engine using YOLOv8.
    Provides object detection, tracking, and anomaly detection for transport scenes.
    
    FIXED: Added explicit YOLO loading verification
    FIXED: Added debug logging at each step
    """

    CONFIDENCE_THRESHOLD = 0.4
    IOU_THRESHOLD = 0.5
    PERSON_LABEL = "person"
    VEHICLE_LABELS = {"car", "truck", "bus", "motorbike", "motorcycle", "bicycle"}
    ALLOWED_CLASSES = {"person", "car", "bus", "truck", "motorbike", "motorcycle", "bicycle"}
    MODEL_INPUT_SIZE = (960, 960)
    STABILIZATION_WINDOW = 5
    FRAME_SKIP = 3
    CONFIRMATION_FRAMES = 3
    MIN_BOX_AREA = 1500  # pixels at model input resolution

    # Force simulation mode for testing (set to True to always use simulation)
    FORCE_SIMULATION = False

    def __init__(self, model_path: str = "yolov8m.pt"):
        global YOLO_LOADED
        self.frame_count = 0
        self.tracker = CentroidTracker()
        self.anomaly_detector = AnomalyDetector()
        self.yolo_model = None
        self.people_history = deque(maxlen=self.STABILIZATION_WINDOW)
        self.vehicle_history = deque(maxlen=self.STABILIZATION_WINDOW)
        self.density_history = deque(maxlen=self.STABILIZATION_WINDOW)
        self.last_annotated_frame = None
        self.previous_result = None
        self.object_seen_frames = defaultdict(int)
        self.track_label_memory = {}
        self.tracked_objects = {}
        self.unique_people_ids = set()
        self.unique_vehicle_ids = set()
        
        # Movement detection
        self.previous_frame = None
        self.previous_frame_gray = None
        
        # Try to load YOLO model
        if YOLO_AVAILABLE and not self.FORCE_SIMULATION:
            try:
                # Check if model file exists
                if os.path.exists(model_path):
                    self.yolo_model = YOLO(model_path)
                    # Verify model works by running a test inference
                    print(f"[INFO] Loading YOLOv8 model from {model_path}...")
                    # Create a dummy frame for testing
                    dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
                    test_results = self.yolo_model(dummy_frame, conf=0.5, verbose=False)
                    print(f"[OK] YOLOv8 model loaded and tested successfully!")
                    self._validate_model_with_dataset()
                    YOLO_LOADED = True
                else:
                    fallback_model = "yolov8n.pt"
                    if os.path.exists(fallback_model):
                        print(f"[WARNING] {model_path} not found. Falling back to local {fallback_model}.")
                        self.yolo_model = YOLO(fallback_model)
                    else:
                        print(f"[WARNING] YOLO model file not found: {model_path}")
                        print("[INFO] Attempting to download and load requested model...")
                        self.yolo_model = YOLO(model_path)
                    print(f"[OK] YOLOv8 model loaded successfully!")
                    self._validate_model_with_dataset()
                    YOLO_LOADED = True
            except Exception as e:
                print(f"[WARNING] Failed to load YOLO model: {e}")
                print("[INFO] Falling back to simulation mode")
                YOLO_LOADED = False
        else:
            print("[OK] TransportDetector initialized (simulation mode)")
            YOLO_LOADED = False

    def _validate_model_with_dataset(self) -> bool:
        """
        Validate YOLO model using reference dataset images before camera pipeline runs.
        """
        dataset_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "datasets", "test_images")
        )
        sample_image = os.path.join(dataset_dir, "street1.jpg")

        if not os.path.exists(sample_image):
            print(f"[WARN] Dataset validation skipped (missing sample): {sample_image}")
            return False

        frame = cv2.imread(sample_image)
        if frame is None:
            print(f"[WARN] Dataset validation failed (unreadable image): {sample_image}")
            return False

        frame = cv2.resize(frame, self.MODEL_INPUT_SIZE)
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.yolo_model(frame, conf=self.CONFIDENCE_THRESHOLD, verbose=False)
        detections = self._parse_yolo_results(results, frame.shape[:2])

        labels = [d["label"] for d in detections]
        people_count = sum(1 for label in labels if label == self.PERSON_LABEL)
        vehicle_count = sum(1 for label in labels if label in self.VEHICLE_LABELS)

        print("[VALIDATION] Detected:", labels)
        print("[VALIDATION] People:", people_count)
        print("[VALIDATION] Vehicles:", vehicle_count)

        if len(detections) == 0:
            print("[WARN] Validation returned empty detections. Check model/runtime.")
            return False

        print("[OK] Dataset validation passed.")
        return True

    def process_frame(self, frame_data: Any = None, source: str = "mobile") -> Dict:
        """Process a frame and return detection results."""
        self.frame_count += 1

        # Run full object detection every N frames and reuse last stable output in-between.
        if self.frame_count % self.FRAME_SKIP != 0 and self.previous_result is not None:
            cached = dict(self.previous_result)
            cached["frame_id"] = self.frame_count
            cached["timestamp"] = datetime.utcnow().isoformat()
            cached["detection_mode"] = f"{cached.get('detection_mode', 'cached')}_cached"
            return cached

        detection_mode = "unavailable"
        
        # Check if we have actual frame data and YOLO is available
        if frame_data is not None and self.yolo_model is not None:
            detections = self._run_yolo_detection(frame_data)
            detection_mode = "yolo"
        elif frame_data is not None:
            # Deterministic fallback: use lightweight OpenCV person detection.
            detections = self._run_cv_fallback_detection(frame_data)
            detection_mode = "cv_fallback"
        else:
            # No frame provided: return empty detections (non-random)
            detections = []

        # Track objects
        rects = [d["bbox"] for d in detections if "bbox" in d]
        objects, trajectories = self.tracker.update(rects)
        detections = self._attach_track_ids(detections, objects)
        self._update_tracked_objects(detections)

        # Count unique confirmed IDs to avoid recounting same objects across frames.
        people_count_raw, vehicle_count_raw = self._count_confirmed_unique_ids(detections)
        if people_count_raw == 0 and vehicle_count_raw == 0:
            # Fallback when tracker IDs are still warming up.
            people_count_raw = sum(1 for d in detections if d.get("label") == self.PERSON_LABEL)
            vehicle_count_raw = sum(1 for d in detections if d.get("label") in self.VEHICLE_LABELS)

        people_count = self._stabilize_count(self.people_history, people_count_raw)
        vehicle_count = self._stabilize_count(self.vehicle_history, vehicle_count_raw)

        frame_area = self.MODEL_INPUT_SIZE[0] * self.MODEL_INPUT_SIZE[1]
        density_ratio = (people_count / frame_area) * 100000
        density_value = min(density_ratio / 10.0, 1.0)
        crowd_density = self._stabilize_density(density_value)

        # Movement speed and anomaly analysis - FIXED: Add movement detection between frames
        anomaly_score = self.anomaly_detector.analyze_trajectories(trajectories)
        
        # FIXED: Calculate movement level using frame differencing
        movement_speed, movement_score = self._detect_movement(frame_data)
        
        # Use combined movement detection
        if movement_score > 0:
            # Combine anomaly-based and frame-difference-based movement
            combined_movement = (anomaly_score + movement_score) / 2
            movement_speed = self._estimate_movement_status(combined_movement)

        # Congestion: combined vehicle density
        congestion_level = round(min(vehicle_count / 40.0 + crowd_density * 0.3, 1.0), 3)

        # FIXED: Calculate density level as per spec
        density_level = self._get_density_level_from_ratio(density_ratio)
        risk_score, risk_level = self._calculate_risk_score(people_count, vehicle_count, movement_speed)

        # Required debug logs for detection verification.
        print("YOLO detections:", detections)
        print("People count:", people_count)
        print("Vehicle count:", vehicle_count)
        self.last_annotated_frame = self._draw_debug_visualization(detections)
        result = {
            # Existing backend-compatible fields
            "people_count": people_count,
            "vehicle_count": vehicle_count,
            "people_count_raw": people_count_raw,
            "vehicle_count_raw": vehicle_count_raw,
            "crowd_density": crowd_density,
            "density_level": density_level,  # FIXED: Add density level
            "movement_speed": movement_speed,
            "movement_level": movement_speed,  # FIXED: Use actual movement speed, not density_level
            "movement_score": movement_score,  # FIXED: Add raw movement score
            "risk_score": risk_score,
            "risk_level": risk_level,
            "anomaly_score": anomaly_score,
            "congestion_level": congestion_level,
            "detection_count": len(detections),
            "frame_id": self.frame_count,
            "source": source,
            "timestamp": datetime.utcnow().isoformat(),
            "detections": detections[:10],  # Return top 10 raw detections
            "detection_mode": detection_mode,
            # Additional structured output requested
            "detectedObjects": detections[:10],
            "peopleCount": people_count,
            "vehicleCount": vehicle_count,
            "densityLevel": density_level,
            "movementLevel": movement_speed,
            "riskScore": risk_score
        }
        self.previous_result = result
        return result

    def _decode_frame(self, frame_data: Any):
        """Decode bytes/base64 frame into BGR image."""
        if frame_data is None:
            return None

        if isinstance(frame_data, bytes):
            image_bytes = frame_data
        elif isinstance(frame_data, str):
            if "," in frame_data:
                frame_data = frame_data.split(",")[1]
            image_bytes = base64.b64decode(frame_data)
        else:
            return None

        nparr = np.frombuffer(image_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    def _stabilize_count(self, history: deque, current_count: int) -> int:
        history.append(current_count)
        return int(round(sum(history) / len(history)))

    def _stabilize_density(self, density_value: float) -> float:
        self.density_history.append(density_value)
        return round(sum(self.density_history) / len(self.density_history), 3)

    def _count_confirmed_unique_ids(self, detections: List[Dict]) -> tuple[int, int]:
        for det in detections:
            obj_id = det.get("track_id")
            label = det.get("label")
            if obj_id is None or label is None:
                continue

            self.track_label_memory[obj_id] = label
            self.object_seen_frames[obj_id] += 1
            if self.object_seen_frames[obj_id] < self.CONFIRMATION_FRAMES:
                continue

            if label == self.PERSON_LABEL:
                self.unique_people_ids.add(obj_id)
            if label in self.VEHICLE_LABELS:
                self.unique_vehicle_ids.add(obj_id)

        # Incremental counts: increase only when new IDs appear.
        return len(self.unique_people_ids), len(self.unique_vehicle_ids)

    def _update_tracked_objects(self, detections: List[Dict]) -> None:
        """
        Maintain tracked object history for backend analytics/debugging.
        tracked_objects = {
          id: {"label": str, "centroid": (cx, cy), "frames_seen": int}
        }
        """
        for det in detections:
            obj_id = det.get("track_id")
            label = det.get("label")
            bbox = det.get("bbox")
            if obj_id is None or label is None or not bbox or len(bbox) < 4:
                continue

            x1, y1, x2, y2 = bbox
            cx = (x1 + x2) / 2.0
            cy = (y1 + y2) / 2.0
            prev_frames_seen = self.tracked_objects.get(obj_id, {}).get("frames_seen", 0)
            self.tracked_objects[obj_id] = {
                "label": label,
                "centroid": (round(cx, 4), round(cy, 4)),
                "frames_seen": prev_frames_seen + 1,
            }

    def _calculate_risk_score(self, people_count: int, vehicle_count: int, movement_level: str) -> tuple[int, str]:
        risk_score = 0
        if people_count > 10:
            risk_score += 40
        if vehicle_count > 5:
            risk_score += 20
        if movement_level == "HIGH":
            risk_score += 30

        if risk_score <= 30:
            risk_level = "LOW"
        elif risk_score <= 70:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        return risk_score, risk_level

    def _run_cv_fallback_detection(self, frame_data: Any) -> List[Dict]:
        """
        Lightweight non-random fallback detector when YOLO model is unavailable.
        Detects people using OpenCV HOG descriptor.
        """
        try:
            if isinstance(frame_data, bytes):
                image_bytes = frame_data
            elif isinstance(frame_data, str):
                if ',' in frame_data:
                    frame_data = frame_data.split(',')[1]
                image_bytes = base64.b64decode(frame_data)
            else:
                return []

            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                return []

            h, w = frame.shape[:2]
            hog = cv2.HOGDescriptor()
            hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            rects, weights = hog.detectMultiScale(
                frame,
                winStride=(8, 8),
                padding=(8, 8),
                scale=1.05
            )

            detections: List[Dict] = []
            for (x, y, rw, rh), conf in zip(rects, weights):
                x1, y1, x2, y2 = x, y, x + rw, y + rh
                detections.append({
                    "label": "person",
                    "class": "person",
                    "confidence": round(float(conf), 3),
                    "bbox": [
                        round(x1 / w, 3),
                        round(y1 / h, 3),
                        round(x2 / w, 3),
                        round(y2 / h, 3),
                    ],
                    "raw_bbox": [float(x1), float(y1), float(x2), float(y2)],
                })

            return detections
        except Exception as e:
            print(f"[ERROR] OpenCV fallback detection failed: {e}")
            return []

    def _attach_track_ids(self, detections: List[Dict], tracked_objects: Dict) -> List[Dict]:
        """
        Attach stable tracker IDs to detections based on nearest centroid matching.
        This enables frontend UI to show each person currently on camera.
        """
        if not detections or not tracked_objects:
            return detections

        candidates = []
        for det_index, det in enumerate(detections):
            bbox = det.get("bbox")
            if not bbox or len(bbox) < 4:
                continue
            x1, y1, x2, y2 = bbox
            det_cx = (x1 + x2) / 2.0
            det_cy = (y1 + y2) / 2.0

            for object_id, centroid in tracked_objects.items():
                obj_cx, obj_cy = float(centroid[0]), float(centroid[1])
                dist = ((det_cx - obj_cx) ** 2 + (det_cy - obj_cy) ** 2) ** 0.5
                candidates.append((dist, det_index, object_id))

        used_detections = set()
        used_objects = set()

        for dist, det_index, object_id in sorted(candidates, key=lambda x: x[0]):
            if det_index in used_detections or object_id in used_objects:
                continue
            # Normalized bboxes have centroids in [0..1]; 0.15 is a conservative match radius.
            if dist > 0.15:
                continue
            detections[det_index]["track_id"] = int(object_id)
            used_detections.add(det_index)
            used_objects.add(object_id)

        return detections

    def _detect_movement(self, frame_data: Any) -> tuple[str, float]:
        """
        FIXED: Detect movement between consecutive frames using OpenCV.
        
        Returns:
            tuple: (movement_level: str, movement_score: float)
            movement_level: "LOW", "MEDIUM", or "HIGH"
            movement_score: 0.0 to 1.0 representing amount of movement
        """
        if frame_data is None:
            # Return simulated movement for demo
            return self._estimate_movement_status(0), 0.0
            
        try:
            # Decode frame from base64
            nparr = np.frombuffer(frame_data, np.uint8)
            current_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if current_frame is None:
                return "LOW", 0.0
            
            # Resize for faster processing
            current_frame = cv2.resize(current_frame, (320, 240))
            
            # Convert to grayscale
            current_gray = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur to reduce noise
            current_gray = cv2.GaussianBlur(current_gray, (21, 21), 0)
            
            if self.previous_frame_gray is not None:
                # Calculate absolute difference between frames
                frame_diff = cv2.absdiff(self.previous_frame_gray, current_gray)
                
                # Apply threshold to get motion mask
                thresh = cv2.threshold(frame_diff, 25, 255, cv2.THRESH_BINARY)[1]
                
                # Dilate to fill holes
                thresh = cv2.dilate(thresh, None, iterations=2)
                
                # Count non-zero pixels (motion pixels)
                motion_pixels = cv2.countNonZero(thresh)
                total_pixels = thresh.shape[0] * thresh.shape[1]
                
                # Calculate movement score (0.0 to 1.0)
                movement_score = min(motion_pixels / (total_pixels * 0.1), 1.0)  # 10% threshold for max
                
                # Determine movement level
                if movement_score < 0.15:
                    movement_level = "LOW"
                elif movement_score < 0.5:
                    movement_level = "MEDIUM"
                else:
                    movement_level = "HIGH"
                
                # Store current frame for next iteration
                self.previous_frame_gray = current_gray
                
                return movement_level, round(movement_score, 3)
            else:
                # First frame - store and return LOW
                self.previous_frame_gray = current_gray
                return "LOW", 0.0
                
        except Exception as e:
            print(f"[ERROR] Movement detection failed: {e}")
            return "LOW", 0.0

    def _get_density_level_from_ratio(self, density_ratio: float) -> str:
        """
        Density based on people-per-area ratio.
        """
        if density_ratio < 2:
            return "LOW"
        elif density_ratio < 6:
            return "MEDIUM"
        else:
            return "HIGH"

    def _run_yolo_detection(self, frame_data: Any) -> List[Dict]:
        """
        Run actual YOLO inference on the frame.
        FIXED: Proper frame decoding from base64.
        """
        try:
            frame = self._decode_frame(frame_data)
            if frame is None:
                print("[WARNING] Failed to decode frame (cv2.imdecode returned None)")
                return []
            
            print(f"[DEBUG] Frame decoded successfully, shape: {frame.shape}")

            # STEP 3: preprocessing for stable YOLOv8 inference.
            frame_resized = cv2.resize(frame, self.MODEL_INPUT_SIZE)
            frame_rgb = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2RGB)
            
            # Run YOLO inference
            results = self.yolo_model(
                frame_rgb,
                conf=self.CONFIDENCE_THRESHOLD,
                iou=self.IOU_THRESHOLD,
                verbose=False
            )
            detections = self._parse_yolo_results(results, frame_rgb.shape[:2])
            detections = self._filter_duplicate_detections(detections, self.IOU_THRESHOLD)
            
            print(f"[YOLO] Detected {len(detections)} relevant objects: {[d['label'] for d in detections]}")
            return detections
            
        except Exception as e:
            print(f"[ERROR] YOLO detection failed: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _normalize_label(self, label: str) -> str:
        """Normalize YOLO class labels for counting consistency."""
        if label == "motorcycle":
            return "motorbike"
        return label

    def _parse_yolo_results(self, results: Any, frame_shape: tuple[int, int]) -> List[Dict]:
        """
        Parse YOLO results into normalized detection objects.
        """
        h, w = frame_shape
        detections = []

        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                cls_id = int(box.cls.item())
                names = self.yolo_model.names
                if isinstance(names, dict):
                    label = names.get(cls_id, str(cls_id))
                elif isinstance(names, list) and 0 <= cls_id < len(names):
                    label = names[cls_id]
                else:
                    label = str(cls_id)

                label = self._normalize_label(label)
                if label not in self.ALLOWED_CLASSES:
                    continue

                confidence = float(box.conf.item())
                if confidence < self.CONFIDENCE_THRESHOLD:
                    continue
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                box_area = max(0.0, (x2 - x1)) * max(0.0, (y2 - y1))
                if box_area < self.MIN_BOX_AREA:
                    continue
                detections.append({
                    "label": label,
                    "class": label,
                    "confidence": round(confidence, 3),
                    "bbox": [
                        float(round(float(x1) / float(w), 3)),
                        float(round(float(y1) / float(h), 3)),
                        float(round(float(x2) / float(w), 3)),
                        float(round(float(y2) / float(h), 3))
                    ],
                    "raw_bbox": [float(x1), float(y1), float(x2), float(y2)]
                })

        return detections

    def _filter_duplicate_detections(self, detections: List[Dict], iou_threshold: float) -> List[Dict]:
        """Secondary NMS-like duplicate filtering by class + IoU."""
        if not detections:
            return []

        filtered: List[Dict] = []
        for det in sorted(detections, key=lambda d: d.get("confidence", 0), reverse=True):
            keep = True
            for kept in filtered:
                if det.get("label") != kept.get("label"):
                    continue
                if self._iou(det.get("bbox"), kept.get("bbox")) > iou_threshold:
                    keep = False
                    break
            if keep:
                filtered.append(det)
        return filtered

    def _iou(self, box_a: List[float], box_b: List[float]) -> float:
        if not box_a or not box_b or len(box_a) < 4 or len(box_b) < 4:
            return 0.0
        ax1, ay1, ax2, ay2 = box_a
        bx1, by1, bx2, by2 = box_b
        inter_x1 = max(ax1, bx1)
        inter_y1 = max(ay1, by1)
        inter_x2 = min(ax2, bx2)
        inter_y2 = min(ay2, by2)
        inter_w = max(0.0, inter_x2 - inter_x1)
        inter_h = max(0.0, inter_y2 - inter_y1)
        inter_area = inter_w * inter_h
        area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
        area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
        union = area_a + area_b - inter_area
        if union <= 0:
            return 0.0
        return inter_area / union

    def _draw_debug_visualization(self, detections: List[Dict]):
        """Draw detection boxes for quick visual debugging."""
        canvas = np.zeros((self.MODEL_INPUT_SIZE[1], self.MODEL_INPUT_SIZE[0], 3), dtype=np.uint8)
        for det in detections:
            bbox = det.get("bbox")
            if not bbox:
                continue
            x1 = int(bbox[0] * self.MODEL_INPUT_SIZE[0])
            y1 = int(bbox[1] * self.MODEL_INPUT_SIZE[1])
            x2 = int(bbox[2] * self.MODEL_INPUT_SIZE[0])
            y2 = int(bbox[3] * self.MODEL_INPUT_SIZE[1])
            label = det.get("label", "obj")
            conf = det.get("confidence", 0.0)
            track_id = det.get("track_id")
            cv2.rectangle(canvas, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                canvas,
                f"ID:{track_id if track_id is not None else '-'} {label}:{conf:.2f}",
                (x1, max(0, y1 - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                1,
                cv2.LINE_AA,
            )
        return canvas

    def _estimate_movement_status(self, anomaly_score: float) -> str:
        """Estimate movement status from anomaly scale."""
        if anomaly_score > 0.6:
            return "HIGH"
        elif anomaly_score > 0.2:
            return "MEDIUM"
        else:
            return "LOW"


# Singleton instance
detector = TransportDetector()

