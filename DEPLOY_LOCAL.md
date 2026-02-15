# Quick Local Deployment Guide

Deploy your music streaming app on Ubuntu server without GitHub in 5 minutes!

## Prerequisites

- Ubuntu server with SSH access
- Docker installed on Ubuntu server

## Step-by-Step Instructions

### 1. Transfer Project to Ubuntu Server

**From Windows (using PowerShell or CMD):**

```powershell
# Replace with your actual paths and server details
scp -r C:\path\to\music-streaming-app username@your-server-ip:/home/username/
```

**Or use a GUI tool:**
- WinSCP
- FileZilla
- Cyberduck

### 2. Connect to Your Ubuntu Server

```bash
ssh username@your-server-ip
```

### 3. Navigate to Project Directory

```bash
cd /home/username/music-streaming-app
```

### 4. Setup Environment Variables

```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
nano .env.local
```

**Required values to update:**

```env
# Update with your server IP
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP:3000
API_BASE_URL=http://YOUR_SERVER_IP:3000

# Add your Firebase credentials
NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Add your Genius API token
GENIUS_ACCESS_TOKEN=your-genius-token
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### 5. Make Scripts Executable

```bash
chmod +x deploy.sh update.sh stop.sh logs.sh
```

### 6. Deploy!

```bash
./deploy.sh
```

That's it! Your app will be available at `http://your-server-ip:3000`

## Management Commands

```bash
# View logs
./logs.sh

# Stop application
./stop.sh

# Update after changes
./update.sh

# Restart
docker restart music-streaming
```

## Manual Docker Commands (Alternative)

If you prefer manual control:

```bash
# Build
docker build -t music-streaming-app:latest .

# Run
docker run -d \
  --name music-streaming \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  music-streaming-app:latest

# View logs
docker logs -f music-streaming

# Stop
docker stop music-streaming

# Remove
docker rm -f music-streaming
```

## Using Docker Compose (Alternative)

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find what's using the port
sudo lsof -i :3000

# Kill it
sudo kill -9 <PID>

# Or use different port in docker run:
docker run -d -p 3001:3000 ...
```

### Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or:
newgrp docker
```

### Firewall Blocking Access

```bash
# Allow port 3000
sudo ufw allow 3000/tcp
sudo ufw reload
```

### Check Container Status

```bash
# List running containers
docker ps

# Check all containers
docker ps -a

# View logs
docker logs music-streaming
```

## Accessing Your App

- **From server:** `http://localhost:3000`
- **From network:** `http://your-server-ip:3000`
- **With domain:** Configure in Coolify or use nginx reverse proxy

## Next Steps

1. ✅ Test user registration and login
2. ✅ Verify music playback works
3. ✅ Test playlist creation
4. 🔒 Setup SSL/HTTPS (optional, via Coolify or nginx)
5. 🌐 Configure custom domain (optional)

## Need Help?

Check the detailed guides:
- `COOLIFY_LOCAL_DEPLOYMENT.md` - Complete local deployment guide
- `COOLIFY_DEPLOYMENT.md` - Coolify-specific instructions
- `README.md` - Application documentation

---

**Quick Reference:**

```bash
# Deploy
./deploy.sh

# Update
./update.sh

# Logs
./logs.sh

# Stop
./stop.sh
```
