# ==============================================================================
# VaaniReach Backend Dockerfile
# FastAPI + FFmpeg + Indic TTS / Multilingual Pipeline
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies:
# - ffmpeg: Required for deterministic Ken Burns video assembly & audio muxing
# - libsndfile1: Required by SoundFile for audio manipulation
# - curl: Used for container healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Layer Caching: Copy requirements first so dependency installation is cached
# unless requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY app/ ./app/

# Ensure output directory exists for media rendering
RUN mkdir -p /app/output

# Expose FastAPI default port
EXPOSE 8000

# Health check to ensure service is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start Uvicorn ASGI server (uses dynamic $PORT from cloud platforms like Render, defaults to 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
