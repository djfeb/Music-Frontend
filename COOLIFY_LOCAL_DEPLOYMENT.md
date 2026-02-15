# Coolify Local Deployment Guide (Without GitHub)

This guide shows how to deploy your Next.js app to Coolify using local files on your Ubuntu server, without needing GitHub or any Git repository.

## Method 1: Deploy with Coolify using Local Docker Image

### Step 1: Transfer Project to Ubuntu Server

From your Windows machine, transfer the project to your Ubuntu server:

```bash
# Using SCP (from Windows PowerShell or CMD)
scp -r C:\path\to\your\project username@your-server-ip:/home/username/music-streaming-app

# Or using WinSCP, FileZilla, or any SFTP client
```

### Step 2: Connect to Your Ubuntu Server

```bash
ssh username@your-server-ip
```

### Step 3: Navigate to Project Directory

```bash
cd /home/username/music-streaming-app
```

### Step 4: Create Environment File

```bash
cp .env.example .env.local
nano .env.local
```

Add your actual values:

```env
NODE_ENV=production
PORT=3000

# Application URLs (update with your server IP)
NEXT_PUBLIC_APP_URL=http://your-server-ip:3000
API_BASE_URL=http://your-server-ip:3000

# Proxy Configuration
PROXY_TARGET_URL=http://102.212.179.119:3000

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Genius API
GENIUS_ACCESS_TOKEN=your-genius-access-token
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 5: Build Docker Image

```bash
docker build -t music-streaming-app:latest .
```

### Step 6: Deploy in Coolify

#### Option A: Using Coolify UI with Docker Image

1. Open Coolify dashboard: `http://your-server-ip:8000`
2. Click "New Resource" → "Application"
3. Select "Docker Image" as source
4. Enter image name: `music-streaming-app:latest`
5. Set port: `3000`
6. Add environment variables (from your .env.local)
7. Click "Deploy"

#### Option B: Using Docker Compose with Coolify

1. In Coolify, create new application
2. Select "Docker Compose" as source
3. Choose "Simple Docker Compose"
4. Coolify will detect your `docker-compose.yml`
5. Add environment variables
6. Deploy

### Step 7: Verify Deployment

```bash
# Check if container is running
docker ps | grep music-streaming

# View logs
docker logs -f music-streaming
```

Access your app at: `http://your-server-ip:3000`

## Method 2: Direct Docker Deployment (Without Coolify UI)

If you prefer to deploy directly without using Coolify's UI:

### Using Docker Run

```bash
# Build the image
docker build -t music-streaming-app:latest .

# Run the container
docker run -d \
  --name music-streaming \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  music-streaming-app:latest

# Check status
docker ps
docker logs music-streaming
```

### Using Docker Compose

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Restart after changes
docker-compose down
docker-compose up -d --build
```

## Method 3: Using Coolify's "Simple Dockerfile" Feature

1. In Coolify dashboard, create "New Resource" → "Application"
2. Select "Simple Dockerfile"
3. Point to your project directory: `/home/username/music-streaming-app`
4. Coolify will use your Dockerfile to build and deploy
5. Add environment variables in Coolify UI
6. Deploy

## Updating Your Application

### After Making Changes

```bash
# Rebuild the image
docker build -t music-streaming-app:latest .

# Stop and remove old container
docker stop music-streaming
docker rm music-streaming

# Run new container
docker run -d \
  --name music-streaming \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  music-streaming-app:latest
```

Or with Docker Compose:

```bash
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or use a different port
docker run -d -p 3001:3000 ...
```

### Permission Denied

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker
```

### Container Keeps Restarting

```bash
# Check logs for errors
docker logs music-streaming

# Common issues:
# - Missing environment variables
# - Port conflicts
# - Build errors
```

### Cannot Connect to Container

```bash
# Check if container is running
docker ps -a

# Check container network
docker inspect music-streaming | grep IPAddress

# Test from server
curl http://localhost:3000
```

### Firewall Issues

```bash
# Allow port 3000 through firewall
sudo ufw allow 3000/tcp
sudo ufw reload

# Check firewall status
sudo ufw status
```

## File Transfer Methods

### Using SCP (Secure Copy)

```bash
# From Windows (PowerShell/CMD)
scp -r C:\path\to\project username@server-ip:/home/username/

# From Linux/Mac
scp -r /path/to/project username@server-ip:/home/username/
```

### Using rsync (More Efficient for Updates)

```bash
# From Linux/Mac
rsync -avz --exclude 'node_modules' --exclude '.next' \
  /path/to/project/ username@server-ip:/home/username/music-streaming-app/

# From Windows (using WSL or Git Bash)
rsync -avz --exclude 'node_modules' --exclude '.next' \
  /mnt/c/path/to/project/ username@server-ip:/home/username/music-streaming-app/
```

### Using SFTP Clients (GUI)

- **WinSCP** (Windows)
- **FileZilla** (Cross-platform)
- **Cyberduck** (Mac/Windows)

## Production Checklist

- [ ] Project files transferred to Ubuntu server
- [ ] .env.local created with correct values
- [ ] Docker image built successfully
- [ ] Container running without errors
- [ ] Application accessible via browser
- [ ] Firebase authentication working
- [ ] Music playback functional
- [ ] Firewall configured (if needed)
- [ ] SSL/HTTPS configured (optional, via Coolify)
- [ ] Domain configured (optional)

## Monitoring

### View Real-time Logs

```bash
docker logs -f music-streaming
```

### Check Resource Usage

```bash
docker stats music-streaming
```

### Check Container Health

```bash
docker inspect music-streaming
```

## Backup Strategy

### Backup Docker Image

```bash
# Save image to file
docker save music-streaming-app:latest | gzip > music-streaming-backup.tar.gz

# Restore from backup
docker load < music-streaming-backup.tar.gz
```

### Backup Project Files

```bash
# Create backup
tar -czf music-streaming-backup-$(date +%Y%m%d).tar.gz /home/username/music-streaming-app

# Restore from backup
tar -xzf music-streaming-backup-20240214.tar.gz -C /home/username/
```

## Quick Commands Reference

```bash
# Build
docker build -t music-streaming-app:latest .

# Run
docker run -d --name music-streaming -p 3000:3000 --env-file .env.local music-streaming-app:latest

# Stop
docker stop music-streaming

# Start
docker start music-streaming

# Restart
docker restart music-streaming

# Remove
docker rm -f music-streaming

# View logs
docker logs -f music-streaming

# Execute command in container
docker exec -it music-streaming sh

# Rebuild and restart
docker stop music-streaming && docker rm music-streaming && docker build -t music-streaming-app:latest . && docker run -d --name music-streaming -p 3000:3000 --env-file .env.local music-streaming-app:latest
```

---

Your application is now deployed locally on your Ubuntu server without needing GitHub!
