"""WebRTC and RTSP Ingestion Router - POST /stream/rtsp"""
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class RTSPIngestRequest(BaseModel):
    rtsp_url: str
    camera_id: str
    zone_id: Optional[str] = None

active_streams = {}

async def _simulate_rtsp_pull(rtsp_url: str, camera_id: str):
    """
    Simulate an RTSP stream pulling frames and pushing to Redis.
    In a real application, cv2.VideoCapture(rtsp_url) would be used.
    """
    active_streams[camera_id] = True
    print(f"[RTSP] Started simulated ingest for {camera_id} at {rtsp_url}")
    while active_streams.get(camera_id):
        # mock: read frame, process, wait
        await asyncio.sleep(1.0)
    print(f"[RTSP] Stopped ingest for {camera_id}")

@router.post("/rtsp")
async def ingest_rtsp(request: RTSPIngestRequest, background_tasks: BackgroundTasks):
    """
    Start WebRTC / RTSP ingestion for a camera stream.
    Runs asynchronously and pushes frames to Redis Streams for workers.
    """
    try:
        if request.camera_id in active_streams and active_streams[request.camera_id]:
            return {
                "success": True, 
                "message": f"Stream {request.camera_id} already active", 
                "job_id": request.camera_id
            }
            
        background_tasks.add_task(_simulate_rtsp_pull, request.rtsp_url, request.camera_id)
        
        return {
            "success": True, 
            "message": f"Started ingestion for {request.camera_id}", 
            "job_id": request.camera_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/rtsp/{camera_id}")
async def stop_rtsp(camera_id: str):
    """Stop an active RTSP stream."""
    if camera_id in active_streams and active_streams[camera_id]:
        active_streams[camera_id] = False
        return {"success": True, "message": f"Stopped stream {camera_id}"}
    raise HTTPException(status_code=404, detail="Stream not found")
