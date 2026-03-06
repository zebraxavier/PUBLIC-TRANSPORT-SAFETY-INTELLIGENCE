"""
Movement Analyzer — YOLOv8 + DeepSORT-style trajectory tracking
Detects crowd anomalies: panic runs, counter-flow, dispersal, loitering.
"""

import numpy as np
from collections import deque
from typing import List, Tuple, Dict

try:
    from sklearn.ensemble import IsolationForest
    _HAS_SKLEARN = True
except ImportError:
    _HAS_SKLEARN = False


class TrackHistory:
    """Stores position history for a single tracked person."""
    MAXLEN = 30  # frames

    def __init__(self, track_id: int):
        self.track_id  = track_id
        self.positions = deque(maxlen=self.MAXLEN)
        self.frames    = deque(maxlen=self.MAXLEN)

    def update(self, cx: float, cy: float, frame_idx: int):
        self.positions.append((cx, cy))
        self.frames.append(frame_idx)

    def velocity(self) -> Tuple[float, float]:
        """Mean (vx, vy) over recent positions."""
        pts = list(self.positions)
        if len(pts) < 2:
            return 0.0, 0.0
        dx = [pts[i+1][0] - pts[i][0] for i in range(len(pts)-1)]
        dy = [pts[i+1][1] - pts[i][1] for i in range(len(pts)-1)]
        return float(np.mean(dx)), float(np.mean(dy))

    def speed(self) -> float:
        vx, vy = self.velocity()
        return float(np.sqrt(vx**2 + vy**2))

    def is_stationary(self, threshold=0.5) -> bool:
        return self.speed() < threshold and len(self.positions) >= 10

    def feature_vector(self) -> List[float]:
        """6-D feature for anomaly detection."""
        pts = list(self.positions)
        vx, vy = self.velocity()
        spd    = self.speed()
        xs     = [p[0] for p in pts]
        ys     = [p[1] for p in pts]
        return [vx, vy, spd, float(np.std(xs)), float(np.std(ys)), len(pts)]


class MovementAnalyzer:
    """
    Frame-by-frame crowd movement analyzer.

    Usage:
        analyzer = MovementAnalyzer()
        result   = analyzer.update(yolo_tracks, frame_idx)
    """

    PANIC_SPEED_THRESHOLD    = 5.0   # px/frame — fast movement
    LOITER_FRAMES_THRESHOLD  = 90    # sustained stationary
    ANOMALY_CONTAMINATION    = 0.05  # 5% of tracks expected anomalous

    def __init__(self):
        self.tracks: Dict[int, TrackHistory] = {}
        self.loiter_counts: Dict[int, int]   = {}
        self._iso_model = None
        self._frame_count = 0

    def update(self, detections: List[Tuple[int, List[float]]], frame_idx: int) -> dict:
        """
        Parameters
        ----------
        detections : list of (track_id, [x1, y1, x2, y2])
        frame_idx  : current frame number

        Returns
        -------
        dict: anomaly_score, anomaly_type, movement_speed, active_tracks, flags
        """
        self._frame_count += 1
        active_ids = set()

        # Update track histories
        for track_id, bbox in detections:
            cx = (bbox[0] + bbox[2]) / 2
            cy = (bbox[1] + bbox[3]) / 2
            if track_id not in self.tracks:
                self.tracks[track_id] = TrackHistory(track_id)
            self.tracks[track_id].update(cx, cy, frame_idx)
            active_ids.add(track_id)

        # Prune stale tracks (not seen for 60 frames)
        stale = [tid for tid in self.tracks if tid not in active_ids]
        for tid in stale:
            del self.tracks[tid]
            self.loiter_counts.pop(tid, None)

        features = [t.feature_vector() for t in self.tracks.values()
                    if len(t.positions) >= 5]

        if len(features) < 5:
            return self._result(0.0, 'normal', 'normal', len(self.tracks), [])

        # ── Anomaly detection ─────────────────────────────────────────────────
        anomaly_score = 0.0
        if _HAS_SKLEARN and len(features) >= 10:
            if self._iso_model is None or self._frame_count % 300 == 0:
                self._iso_model = IsolationForest(
                    contamination=self.ANOMALY_CONTAMINATION, random_state=42)
            labels        = self._iso_model.fit_predict(features)
            anomaly_ratio = float((labels == -1).sum() / len(labels))
            anomaly_score = anomaly_ratio
        else:
            # Fallback: rule-based anomaly score
            speeds = [t.speed() for t in self.tracks.values()]
            anomaly_score = min(1.0, np.mean(speeds) / 10.0) if speeds else 0.0

        # ── Classify anomaly type ─────────────────────────────────────────────
        speeds       = [t.speed() for t in self.tracks.values()]
        mean_speed   = float(np.mean(speeds)) if speeds else 0.0
        flags        = []
        anomaly_type = 'normal'

        if anomaly_score > 0.25:
            if mean_speed > self.PANIC_SPEED_THRESHOLD:
                anomaly_type = 'panic_run'
                flags.append('HIGH_SPEED')
            elif self._is_counter_flow():
                anomaly_type = 'counter_flow'
                flags.append('COUNTER_FLOW')
            elif self._is_radial_dispersal():
                anomaly_type = 'crowd_dispersal'
                flags.append('DISPERSAL')
            else:
                anomaly_type = 'unusual_movement'

        # ── Loitering detection ───────────────────────────────────────────────
        for tid, track in self.tracks.items():
            if track.is_stationary():
                self.loiter_counts[tid] = self.loiter_counts.get(tid, 0) + 1
                if self.loiter_counts[tid] >= self.LOITER_FRAMES_THRESHOLD:
                    flags.append(f'LOITERING:{tid}')
            else:
                self.loiter_counts[tid] = 0

        # ── Movement speed label ──────────────────────────────────────────────
        movement_label = ('very_fast'  if mean_speed > 6.0 else
                          'fast'       if mean_speed > 3.5 else
                          'normal'     if mean_speed > 1.5 else
                          'slow'       if mean_speed > 0.5 else 'very_slow')

        return self._result(anomaly_score, anomaly_type, movement_label,
                            len(self.tracks), flags)

    def _is_counter_flow(self) -> bool:
        """Detect bi-directional crowd split (high angular variance)."""
        if len(self.tracks) < 8:
            return False
        dirs    = [t.velocity() for t in self.tracks.values()]
        angles  = [np.arctan2(d[1], d[0]) for d in dirs if abs(d[0]) + abs(d[1]) > 0.1]
        return float(np.std(angles)) > 1.8 if len(angles) >= 5 else False

    def _is_radial_dispersal(self) -> bool:
        """Detect crowd dispersing outward from central point."""
        if len(self.tracks) < 8:
            return False
        pts = np.array([list(t.positions)[-1] for t in self.tracks.values()
                        if len(t.positions) >= 1])
        center = pts.mean(axis=0)
        vels   = np.array([list(t.velocity()) for t in self.tracks.values()])
        # Radial component: dot(vel, position-center) should be positive for dispersal
        norms  = pts - center
        dists  = np.linalg.norm(norms, axis=1, keepdims=True) + 1e-6
        unit_r = norms / dists
        radial = np.sum(vels * unit_r, axis=1)
        return float(np.mean(radial > 0)) > 0.70  # 70% moving outward

    @staticmethod
    def _result(score, atype, speed, n_tracks, flags) -> dict:
        return {
            'anomaly_score':   round(score, 3),
            'anomaly_type':    atype,
            'movement_speed':  speed,
            'active_tracks':   n_tracks,
            'flags':           flags,
        }


# Module-level singleton
movement_analyzer = MovementAnalyzer()
