"""
VaaniReach Backend Server Entrypoint.
FastAPI service exposing L1 Ingestion, L3 Providers, L4 Agents, L2 Assembly, and L5 Orchestration.
"""
from __future__ import annotations

import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as api_router
from app.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("vaanireach.main")

app = FastAPI(
    title="VaaniReach API",
    description="Multilingual Outreach Video Generator with Luma AI, Indic TTS, and Fact-Grounding Gate",
    version="1.0.0",
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount output directory for direct media playback
output_dir = Path(settings.OUTPUT_ROOT)
output_dir.mkdir(parents=True, exist_ok=True)
app.mount("/output", StaticFiles(directory=str(output_dir)), name="output")

# Include API and WebSocket routes
app.include_router(api_router)


@app.get("/health")
async def health_check():
    """Service health check."""
    return {
        "status": "healthy",
        "service": "VaaniReach Backend",
        "version": "1.0.0",
        "luma_configured": bool(settings.LUMA_API_KEY),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
