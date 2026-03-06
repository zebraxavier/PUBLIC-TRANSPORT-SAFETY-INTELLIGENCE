"""
Unified Risk Engine — PTSI Production Refactor
Combines ML (RandomForestClassifier) with a rule-based override layer.
ML model handles nuanced middle-ground; hard rules catch critical extremes.

FIXED: Added spec-based risk scoring algorithm:
- if people_count > 10: +40
- if vehicle_count > 5: +20
- if movement_level == "HIGH": +30
- Risk levels: 0-30 → LOW, 31-70 → MEDIUM, 71-100 → HIGH
"""

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib, os

MODEL_PATH  = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')
SCALER_PATH = os.path.join(os.path.dirname(__file__), 'scaler.pkl')

# ── Thresholds ────────────────────────────────────────────────────────────────
DANGER_THRESHOLD  = 65
WARNING_THRESHOLD = 35

# FIXED: Spec-based risk scoring
RISK_RULES = {
    'people_threshold': 10,      # +40 if people > 10
    'vehicle_threshold': 5,     # +20 if vehicles > 5
    'movement_high_add': 30,      # +30 if movement is HIGH
}

def calculate_risk_score_spec(people_count: int, vehicle_count: int, 
                               movement_level: str, crowd_density: float = 0.0) -> dict:
    """
    FIXED: Calculate risk score based on specification.
    
    Algorithm:
    - if people_count > 10: +40
    - if vehicle_count > 5: +20  
    - if movement_level == "HIGH": +30
    - Risk levels: 0-30 → LOW, 31-70 → MEDIUM, 71-100 → HIGH
    
    Returns:
        dict with risk_score, risk_level
    """
    risk_score = 0
    
    # Add points for people count
    if people_count > RISK_RULES['people_threshold']:
        risk_score += 40
    
    # Add points for vehicle count
    if vehicle_count > RISK_RULES['vehicle_threshold']:
        risk_score += 20
    
    # Add points for high movement
    if movement_level == "HIGH":
        risk_score += RISK_RULES['movement_high_add']
    
    # Cap at 100
    risk_score = min(risk_score, 100)
    
    # Determine risk level
    if risk_score <= 30:
        risk_level = "LOW"
    elif risk_score <= 70:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"
    
    return {
        'risk_score': risk_score,
        'risk_level': risk_level
    }

# ── Safety-Critical Hard Rules (override ML when extreme conditions hit) ──────
# Safety-first principle: prefer false positive over false negative
DANGER_OVERRIDE_RULES = [
    lambda f: f.get('crowd_density', 0)  > 0.90,              # near-capacity crowd
    lambda f: f.get('vehicle_count', 0)  > 45,                # heavy traffic
    lambda f: (f.get('movement_speed', '') == 'very_fast'
               and f.get('crowd_density', 0) > 0.60),          # panic + crowd
    lambda f: f.get('anomaly_score', 0)  > 0.80,              # movement anomaly
]

WARNING_OVERRIDE_RULES = [
    lambda f: f.get('crowd_density', 0)  > 0.70,
    lambda f: f.get('vehicle_count', 0)  > 30,
    lambda f: f.get('congestion_level', 0) > 0.75,
]


def _get_model():
    """Load or train the RandomForest model."""
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        return joblib.load(MODEL_PATH), joblib.load(SCALER_PATH)

    print("[INFO] Training unified risk model on synthetic data...")
    np.random.seed(42)
    n = 3000
    crowd      = np.random.beta(2, 3, n)
    vehicles   = np.random.randint(0, 60, n)
    congestion = np.random.beta(2, 3, n)
    hour       = np.random.randint(0, 24, n)
    weather    = np.random.uniform(0, 1, n)
    loc_type   = np.random.randint(0, 5, n)
    anomaly    = np.random.beta(1, 5, n)

    is_peak = ((hour >= 7) & (hour <= 9) | (hour >= 17) & (hour <= 20)).astype(float)

    risk = (0.40 * crowd + 0.30 * np.minimum(vehicles / 50, 1.0) +
            0.15 * congestion + 0.05 * is_peak + 0.05 * weather +
            0.05 * anomaly + np.random.normal(0, 0.04, n))

    y = np.where(risk < 0.35, 0, np.where(risk < 0.65, 1, 2))
    X = np.column_stack([crowd, vehicles, congestion, hour, weather, loc_type, is_peak, anomaly])

    scaler = StandardScaler()
    X_s    = scaler.fit_transform(X)
    model  = RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=-1)
    model.fit(X_s, y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"[OK] Unified risk model trained and saved → {MODEL_PATH}")
    return model, scaler


_model, _scaler = _get_model()
LABEL_MAP = {0: 'safe', 1: 'warning', 2: 'danger'}
COLOR_MAP  = {0: '#22c55e', 1: '#f59e0b', 2: '#ef4444'}


def _ml_risk_score(features: dict) -> float:
    """Run ML inference, return numeric score 0-100."""
    is_peak = 1.0 if (7 <= features.get('time_of_day', 12) <= 9
                      or 17 <= features.get('time_of_day', 12) <= 20) else 0.0
    X = np.array([[
        features.get('crowd_density', 0),
        features.get('vehicle_count', 0),
        features.get('congestion_level', 0),
        features.get('time_of_day', 12),
        features.get('weather_condition', 0.1),
        features.get('location_type', 0),
        is_peak,
        features.get('anomaly_score', 0),
    ]])
    X_s   = _scaler.transform(X)
    proba = _model.predict_proba(X_s)[0]
    # Weighted score: safe=0, warning=50, danger=100
    return round(float(proba[1] * 50 + proba[2] * 100), 1)


def _apply_rules(features: dict) -> tuple[bool, int, str]:
    """Check hard override rules. Returns (triggered, score, reason)."""
    for rule in DANGER_OVERRIDE_RULES:
        if rule(features):
            return True, 85, 'danger_rule_override'
    for rule in WARNING_OVERRIDE_RULES:
        if rule(features):
            return True, 45, 'warning_rule_override'
    return False, 0, 'none'


def _explain(features, rule_triggered, ml_score, rule_score) -> str:
    reasons = []
    if features.get('crowd_density', 0) > 0.7:
        reasons.append(f"high crowd density ({features['crowd_density']:.0%})")
    if features.get('vehicle_count', 0) > 30:
        reasons.append(f"heavy vehicles ({features['vehicle_count']})")
    if features.get('anomaly_score', 0) > 0.5:
        reasons.append(f"movement anomaly ({features['anomaly_score']:.2f})")
    if rule_triggered:
        reasons.append("hard safety rule triggered")
    if not reasons:
        reasons.append("routine monitoring")
    return '; '.join(reasons)


def evaluate_frame(features: dict) -> dict:
    """
    Main entry point for unified risk evaluation.

    Parameters
    ----------
    features : dict
        crowd_density, vehicle_count, congestion_level, time_of_day,
        weather_condition, location_type, anomaly_score, movement_speed

    Returns
    -------
    dict with risk_score, risk_level, ml_score, rule_override, explanation
    """
    ml_score                      = _ml_risk_score(features)
    rule_triggered, rule_score, _ = _apply_rules(features)

    # Safety-first: take the higher of ML and rules
    final_score = max(ml_score, rule_score if rule_triggered else 0)

    level   = ('danger'  if final_score >= DANGER_THRESHOLD  else
               'warning' if final_score >= WARNING_THRESHOLD else 'safe')
    label_idx = {'safe': 0, 'warning': 1, 'danger': 2}[level]

    return {
        'risk_score':    final_score,
        'risk_level':    level,
        'risk_color':    COLOR_MAP[label_idx],
        'ml_score':      ml_score,
        'rule_override': rule_triggered,
        'rule_score':    rule_score if rule_triggered else 0,
        'explanation':   _explain(features, rule_triggered, ml_score, rule_score),
        'features_used': features,
    }

def predict_risk(
    crowd_density: float,
    vehicle_count: int,
    congestion_level: float,
    time_of_day: int = 12,
    weather_condition: float = 0.1,
    location_type: int = 0,
    anomaly_score: float = 0.0
) -> dict:
    """Compatibility alias for old predict_risk signature."""
    features = {
        'crowd_density': crowd_density,
        'vehicle_count': vehicle_count,
        'congestion_level': congestion_level,
        'time_of_day': time_of_day,
        'weather_condition': weather_condition,
        'location_type': location_type,
        'anomaly_score': anomaly_score
    }
    return evaluate_frame(features)
