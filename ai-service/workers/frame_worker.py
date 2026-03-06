import os
import sys
import json
import base64
import time
import redis
import traceback

# Add parent directory to sys.path to allow imports from cv and models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cv.detector import detector
from models.unified_risk_engine import evaluate_frame

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
STREAM_KEY = "frames:queue"
RESULTS_CHANNEL = "frames:results"
GROUP_NAME = "ptsi-workers"
CONSUMER_NAME = f"worker-{os.getpid()}"

print(f"[Worker] Starting {CONSUMER_NAME} connecting to {REDIS_URL}")

try:
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()
    print("[Worker] Connected to Redis")
except Exception as e:
    print(f"[Worker] Redis connection failed: {e}")
    sys.exit(1)

# Ensure consumer group exists
try:
    r.xgroup_create(STREAM_KEY, GROUP_NAME, id="0", mkstream=True)
    print(f"[Worker] Created consumer group {GROUP_NAME}")
except redis.exceptions.ResponseError as e:
    if "BUSYGROUP" in str(e):
        pass # Group already exists
    else:
        print(f"[Worker] Could not create consumer group: {e}")

def process_messages():
    print(f"[Worker] {CONSUMER_NAME} listening for frames on {STREAM_KEY}...")
    while True:
        try:
            # Block for up to 2 seconds, read 1 message from the 'ptsi-workers' group
            messages = r.xreadgroup(GROUP_NAME, CONSUMER_NAME, {STREAM_KEY: '>'}, count=1, block=2000)
            
            if not messages:
                continue

            for stream_name, events in messages:
                for event_id, fields in events:
                    job_id = fields.get("jobId")
                    frame_b64 = fields.get("frame_b64", "")
                    
                    try:
                        # Decode frame
                        frame_data = None
                        if frame_b64:
                            frame_data = base64.b64decode(frame_b64)
                        
                        # Process frame
                        det_result = detector.process_frame(frame_data=frame_data, source="stream")
                        
                        # Evaluate risk
                        risk_result = evaluate_frame(det_result)
                        
                        # Combine results
                        final_result = {
                            "jobId": job_id,
                            "zoneId": fields.get("zoneId"),
                            "zoneName": fields.get("zoneName"),
                            "success": True,
                            **det_result,
                            **risk_result
                        }
                        
                        # Publish result
                        r.publish(RESULTS_CHANNEL, json.dumps(final_result))
                        
                        # Acknowledge message
                        r.xack(STREAM_KEY, GROUP_NAME, event_id)
                        print(f"[Worker] Processed job {job_id}")
                        
                    except Exception as e:
                        print(f"[Worker] Error processing job {job_id}: {e}")
                        traceback.print_exc()
                        # Still ack to prevent infinite loop or implement DLQ
                        r.xack(STREAM_KEY, GROUP_NAME, event_id)

        except redis.exceptions.ConnectionError:
            print("[Worker] Redis connection lost. Reconnecting in 5s...")
            time.sleep(5)
        except Exception as e:
            print(f"[Worker] Unexpected error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    process_messages()
