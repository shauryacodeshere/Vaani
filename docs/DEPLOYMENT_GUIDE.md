# VaaniReach — Production Deployment & Learning Guide

This guide walks you through the entire deployment architecture of **VaaniReach**, explaining **how each technology works**, **why decisions were made**, and **how to deploy to a real-world Cloud VPS** (AWS EC2, DigitalOcean, Hetzner, etc.).

---

## 1. Concepts: How Docker Works Under the Hood

Before running commands, it helps to understand the core abstractions of containerization:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Docker Host (Linux Kernel / macOS Hypervisor)                               │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Image: Read-only blueprint / snapshot of code + libraries + OS      │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │ creates                              │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Container: Live, isolated, running process executing the image      │   │
│   │                                                                     │   │
│   │  [ Isolated Filesystem ]    [ Isolated PID ]    [ Isolated Network ]│   │
│   └───────────────┬──────────────────────────────────────────┬──────────┘   │
│                   │ mounts                                   │ connects     │
│                   ▼                                          ▼              │
│       ┌───────────────────────┐                  ┌──────────────────────┐   │
│       │ Volume (Persistent)   │                  │ Virtual Network      │   │
│       │ ./backend/output      │                  │ vaanireach-network   │   │
│       └───────────────────────┘                  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Image (`Dockerfile`)**: A static, immutable recipe containing the OS filesystem, system binaries (`ffmpeg`, `curl`), runtime (`python3` or `node`), and application code.
2. **Container**: A running instance of an image. Containers are ephemeral by default — if you delete a container, any files written inside it disappear.
3. **Volume (`volumes:`)**: Bridges host directories with container directories. When VaaniReach generates an MP4 in `/app/output`, it is written directly to `./backend/output` on the host machine.
4. **Network (`networks:`)**: An isolated virtual software-defined bridge network. Containers on the same network can discover and talk to each other using their service names (e.g. `backend` resolves to the backend container's IP).

---

## 2. Deconstructing the Dockerfiles

### A. The Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM python:3.11-slim
```
- **Why `slim`?** The full `python:3.11` image is ~1GB. `python:3.11-slim` is only ~120MB, containing Debian with Python pre-installed without unnecessary compilers.

```dockerfile
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app
```
- `PYTHONDONTWRITEBYTECODE=1`: Stops Python from creating `.pyc` files inside the container, saving disk space.
- `PYTHONUNBUFFERED=1`: Forces stdout and stderr to flush immediately so you can see live logs in real time with `docker compose logs -f`.
- `PYTHONPATH=/app`: Ensures imports like `from app.main import app` work cleanly from the root directory.

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*
```
- **Why `ffmpeg` & `libsndfile1`?** VaaniReach renders videos with Ken Burns zoom, subtitles, and lip-sync audio processing. These require native C/C++ libraries. Installing them at the OS level guarantees reproducibility on any cloud host.
- **Why `rm -rf /var/lib/apt/lists/*`?** After installing packages, deleting Debian's apt package cache drops ~30-50MB from the final image.

```dockerfile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
```
- **Docker Layer Caching**: Docker builds images in cached layers. If you only edit Python code (`app/main.py`), Docker reuses the cached `pip install` layer. Rebuilding takes 1 second instead of reinstalling dependencies every time!

---

### B. The Frontend Multi-Stage Dockerfile (`frontend/Dockerfile`)

Next.js apps are traditionally large because `node_modules` can take 500MB–1GB. We use a **3-stage build**:

```
Stage 1: [deps]     ───> Installs node_modules with npm ci
                             │
Stage 2: [builder]  ───> Inlines API URLs & runs `next build` with output: "standalone"
                             │ (extracts only the minimal JS bundle needed)
Stage 3: [runner]   ───> Lightweight production image running `node server.js`
                         (Total image: ~150MB instead of 1.2GB!)
```

Key features:
- **Standalone Mode (`output: "standalone"` in `next.config.ts`)**: Automatically traces imports and bundles only the required packages into `.next/standalone/server.js`.
- **Non-Root User (`nextjs:nodejs`)**: Containers should never run as `root` in production. Running as an unprivileged user prevents container breakout security vulnerabilities.

---

## 3. Orchestrating with Docker Compose (`docker-compose.yml`)

The `docker-compose.yml` file ties our microservices together:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend/output:/app/output
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
...
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy
```

- **Healthcheck & `condition: service_healthy`**: Without this, both containers start simultaneously. If the frontend requests the backend before FastAPI has finished loading models, the user gets connection errors. Compose waits until `/health` returns `HTTP 200` before launching the frontend!

---

## 4. Local Testing & Commands

### 1. Build and start containers in the background:
```bash
docker compose up -d --build
```
- `-d`: Detached mode (runs in background).
- `--build`: Rebuilds images if any Dockerfiles or requirements changed.

### 2. Check container status:
```bash
docker compose ps
```
You will see both `vaanireach-backend` (healthy) and `vaanireach-frontend` (running).

### 3. Stream live logs:
```bash
# Stream all logs
docker compose logs -f

# Stream only backend (e.g. video rendering & agent logs)
docker compose logs -f backend
```

### 4. Verify endpoints:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **Backend Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 5. Stop containers:
```bash
docker compose down
```

---

## 5. Cloud VPS Deployment (AWS EC2 / DigitalOcean / Hetzner)

Here is the exact production workflow to deploy on a Linux Virtual Private Server (VPS).

### Step 1: Recommended Server Specs
- **OS**: Ubuntu 22.04 LTS or 24.04 LTS
- **CPU**: Minimum 2 vCPU (4 vCPU recommended for faster FFmpeg rendering)
- **RAM**: Minimum 4 GB (8 GB recommended if generating video with Luma or complex animations)
- **Disk**: 40 GB+ SSD

---

### Step 2: Install Docker on the Server
SSH into your VPS:
```bash
ssh root@YOUR_SERVER_IP
```

Run the official Docker setup script:
```bash
# Update package index
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release git ufw

# Install Docker Engine & Docker Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify installation
docker --version
docker compose version
```

---

### Step 3: Configure Firewall (UFW)
Allow SSH, HTTP, and HTTPS:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

### Step 4: Clone Repository & Configure Environment
```bash
# Clone the repository
git clone https://github.com/Pruthv-creates/codeissance-26.git /var/www/vaanireach
cd /var/www/vaanireach

# Copy your production environment variables
cp backend/.env.example backend/.env
nano backend/.env
```
Add your production API keys (`LUMA_API_KEY`, `SARVAM_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL`, etc.).

---

### Step 5: Production Nginx Reverse Proxy + SSL (Certbot)

In production, you should **never expose internal ports 3000 and 8000 directly to the internet**. Instead, run **Nginx** on the host to route traffic securely over HTTPS (Port 443).

```
User (Browser) ──HTTPS:443──> Nginx (Host)
                                ├── /api, /output, /ws  ──> http://localhost:8000 (Backend)
                                └── / (all other paths) ──> http://localhost:3000 (Frontend)
```

#### 1. Install Nginx:
```bash
sudo apt install -y nginx
```

#### 2. Create Nginx site configuration:
```bash
sudo nano /etc/nginx/sites-available/vaanireach
```
Paste this configuration (replace `your-domain.com` with your actual domain or VPS IP):

```nginx
server {
    server_name your-domain.com;

    client_max_body_size 50M;

    # Frontend routes
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API routes
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend output media serving
    location /output/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }

    # WebSocket status channel
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

#### 3. Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/vaanireach /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. Obtain Free SSL Certificate (Let's Encrypt):
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
Certbot automatically installs the SSL certificates and sets up auto-renewal!

---

### Step 6: Start VaaniReach in Production

Build the images with the public API URL (pointing to your domain):

```bash
cd /var/www/vaanireach
NEXT_PUBLIC_API_URL=https://your-domain.com docker compose up -d --build
```

---

## 6. Auto-Start on System Boot (Systemd)

To make sure VaaniReach restarts automatically if the server reboots:

Create a systemd service:
```bash
sudo nano /etc/systemd/system/vaanireach.service
```

Paste:
```ini
[Unit]
Description=VaaniReach Docker Compose Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/var/www/vaanireach
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable vaanireach.service
```

---

## 7. Operational Cheat Sheet

| Task | Command |
|---|---|
| View container CPU & RAM usage | `docker stats` |
| View active running containers | `docker compose ps` |
| Tail backend logs | `docker compose logs -f backend` |
| Tail frontend logs | `docker compose logs -f frontend` |
| Restart backend container only | `docker compose restart backend` |
| Rebuild container after code changes | `docker compose up -d --build` |
| Free unused Docker cache and images | `docker system prune -af` |
