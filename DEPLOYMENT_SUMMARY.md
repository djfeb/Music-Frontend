# Deployment Files Summary

All files needed to deploy your Music Streaming App to Ubuntu server without GitHub.

## 📁 Files Created

### Docker Configuration
- **Dockerfile** - Multi-stage Docker build for production
- **.dockerignore** - Excludes unnecessary files from Docker build
- **docker-compose.yml** - Docker Compose configuration (optional method)

### Deployment Scripts (Linux/Ubuntu)
- **deploy.sh** - Initial deployment script
- **update.sh** - Update/redeploy after changes
- **stop.sh** - Stop the application
- **logs.sh** - View application logs
- **status.sh** - Check deployment status

### Documentation
- **DEPLOY_LOCAL.md** - Quick start guide (5 minutes)
- **COOLIFY_LOCAL_DEPLOYMENT.md** - Complete local deployment guide
- **COOLIFY_DEPLOYMENT.md** - Coolify with GitHub guide
- **QUICK_START.txt** - Quick reference card

### Configuration
- **.env.example** - Environment variables template
- **next.config.mjs** - Updated with `output: 'standalone'`

## 🚀 Quick Deployment (3 Methods)

### Method 1: Using Deployment Scripts (Recommended)
```bash
# On Ubuntu server
cd /home/username/music-streaming-app
cp .env.example .env.local
nano .env.local  # Add your credentials
chmod +x *.sh
./deploy.sh
```

### Method 2: Using Docker Compose
```bash
# On Ubuntu server
cd /home/username/music-streaming-app
cp .env.example .env.local
nano .env.local  # Add your credentials
docker-compose up -d
```

### Method 3: Manual Docker Commands
```bash
# On Ubuntu server
cd /home/username/music-streaming-app
cp .env.example .env.local
nano .env.local  # Add your credentials
docker build -t music-streaming-app:latest .
docker run -d --name music-streaming -p 3000:3000 --env-file .env.local music-streaming-app:latest
```

## 📋 Deployment Checklist

### Before Deployment
- [ ] Transfer project files to Ubuntu server
- [ ] Install Docker on Ubuntu server
- [ ] Get Firebase credentials
- [ ] Get Genius API token
- [ ] Know your server IP address

### During Deployment
- [ ] Create .env.local from .env.example
- [ ] Update all environment variables
- [ ] Make scripts executable (chmod +x *.sh)
- [ ] Run deployment script or docker commands
- [ ] Check firewall settings if needed

### After Deployment
- [ ] Access app in browser (http://server-ip:3000)
- [ ] Test user registration
- [ ] Test user login
- [ ] Test music playback
- [ ] Test search functionality
- [ ] Test playlist creation
- [ ] Verify Firebase connection
- [ ] Test lyrics feature

## 🔧 Management Commands

```bash
# Check status
./status.sh

# View logs
./logs.sh

# Stop application
./stop.sh

# Update application
./update.sh

# Restart
docker restart music-streaming

# Remove completely
docker rm -f music-streaming
docker rmi music-streaming-app:latest
```

## 🌐 Access Your Application

- **Local:** http://localhost:3000
- **Network:** http://your-server-ip:3000
- **Domain:** Configure via Coolify or nginx reverse proxy

## 📝 Environment Variables Required

```env
# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=http://your-server-ip:3000
API_BASE_URL=http://your-server-ip:3000

# Music API
PROXY_TARGET_URL=http://102.212.179.119:3000

# Firebase (Get from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Genius API (Get from https://genius.com/api-clients)
GENIUS_ACCESS_TOKEN=
```

## 🔍 Troubleshooting

### Container won't start
```bash
docker logs music-streaming
```

### Port already in use
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Permission denied
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Firewall blocking
```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

### Can't connect to Firebase
- Add your server IP/domain to Firebase authorized domains
- Firebase Console → Authentication → Settings → Authorized domains

## 📚 Documentation Guide

1. **Start here:** `QUICK_START.txt` - Quick reference
2. **Quick deployment:** `DEPLOY_LOCAL.md` - 5-minute guide
3. **Detailed guide:** `COOLIFY_LOCAL_DEPLOYMENT.md` - Complete instructions
4. **With GitHub:** `COOLIFY_DEPLOYMENT.md` - If using Git
5. **App info:** `README.md` - Application documentation

## 🎯 Next Steps After Deployment

1. **Security:**
   - Setup SSL/HTTPS (via Coolify or Let's Encrypt)
   - Configure Firebase security rules
   - Setup firewall rules

2. **Domain:**
   - Point domain to server IP
   - Configure in Coolify or nginx
   - Update environment variables

3. **Monitoring:**
   - Setup log rotation
   - Monitor resource usage
   - Setup backup strategy

4. **Optimization:**
   - Enable caching
   - Setup CDN for static assets
   - Optimize images

## 💡 Tips

- Use `./status.sh` to quickly check if everything is running
- Use `./logs.sh` to debug issues in real-time
- Keep `.env.local` secure and never commit it to Git
- Backup your `.env.local` file
- Test thoroughly after deployment
- Monitor logs for the first few hours

## 🆘 Getting Help

- Check logs: `./logs.sh`
- Check status: `./status.sh`
- View container info: `docker inspect music-streaming`
- Check Docker: `docker ps -a`
- Test connection: `curl http://localhost:3000`

---

**Ready to deploy?** Start with `QUICK_START.txt` or `DEPLOY_LOCAL.md`!
