from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import detection, predict, simulate, stream_ingest

app = FastAPI(
    title="PTSI AI Service",
    description="Public Transport Safety Intelligence - AI & Computer Vision Microservice",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection.router, tags=["Detection"])
app.include_router(predict.router, prefix="/predict", tags=["Prediction"])
app.include_router(simulate.router, prefix="/simulate", tags=["Simulation"])
app.include_router(stream_ingest.router, prefix="/stream", tags=["Ingest"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "PTSI AI Service", "version": "1.0.0"}

@app.get("/")
async def root():
    return {
        "service": "Public Transport Safety Intelligence - AI Microservice",
        "endpoints": ["/detect", "/predict/risk", "/simulate/scenario", "/health", "/docs"]
    }
