import numpy as np

class AnomalyDetector:
    def __init__(self, velocity_threshold=0.1, direction_variance_threshold=0.5):
        self.velocity_threshold = velocity_threshold
        self.direction_variance_threshold = direction_variance_threshold

    def analyze_trajectories(self, trajectories):
        """
        Analyze recent trajectories to compute crowd anomaly score.
        High velocity variance or sudden direction changes indicate panic/anomaly.
        """
        if not trajectories or len(trajectories) < 2:
            return 0.0

        speeds = []
        directions = []

        for obj_id, pts in trajectories.items():
            if len(pts) < 5:
                continue
            
            # Calculate instantaneous speeds and directions
            pts_arr = np.array(pts)
            deltas = pts_arr[1:] - pts_arr[:-1]
            
            # Speed is magnitude of delta
            obj_speeds = np.linalg.norm(deltas, axis=1)
            speeds.extend(obj_speeds)
            
            # Direction is angle
            obj_dirs = np.arctan2(deltas[:, 1], deltas[:, 0])
            directions.extend(obj_dirs)

        if not speeds:
            return 0.0

        std_speed = np.std(speeds)
        
        # Circular variance for directions (1 - R)
        if directions:
            mean_cos = np.mean(np.cos(directions))
            mean_sin = np.mean(np.sin(directions))
            r = np.sqrt(mean_cos**2 + mean_sin**2)
            dir_variance = 1.0 - r
        else:
            dir_variance = 0.0

        # Anomaly score logic
        score_component_1 = min(std_speed / self.velocity_threshold, 1.0)
        score_component_2 = min(dir_variance / self.direction_variance_threshold, 1.0)
        
        overall_anomaly = (score_component_1 * 0.6) + (score_component_2 * 0.4)
        
        return round(min(overall_anomaly, 1.0), 3)
