# Coolify Deployment Guide

This guide will help you deploy your Next.js music streaming application to Coolify on your local Ubuntu server.

## Prerequisites

1. Ubuntu server with Coolify installed
2. Docker and Docker Compose installed on your server
3. Git repository access (GitHub, GitLab, or local Git)
4. Firebase project credentials
5. Genius API token (for lyrics feature)

## Step 1: Prepare Your Server

### Install Coolify (if not already installed)

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Access Coolify at `http://your-server-ip:8000`

## Step 2: Push Your Code to Git Repository

If you haven't already, initialize a git repository and push your code:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-git-repo-url>
git push -u origin main
```

## Step 3: Create a New Application in Coolify

1. Log in to your Coolify dashboard
2. Click "New Resource" → "Application"
3. Choose your Git source (GitHub, GitLab, or custom Git)
4. Select your repository and branch (usually `main` or `master`)
5. Choose "Dockerfile" as the build pack

## Step 4: Configure Build Settings

In Coolify application settings:

### Build Configuration
- **Build Pack**: Dockerfile
- **Dockerfile Location**: `./Dockerfile`
- **Port**: 3000
- **Base Directory**: `/` (root)

### Environment Variables

Add the following environment variables in Coolify:

```env
# Node Environment
NODE_ENV=production
PORT=3000

# Application URLs
NEXT_PUBLIC_APP_URL=http://your-server-ip:port
API_BASE_URL=http://your-server-ip:port

# Proxy Configuration (if using external music API)
PROXY_TARGET_URL=http://102.212.179.119:3000

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Genius API (for lyrics)
GENIUS_ACCESS_TOKEN=your-genius-access-token
```

## Step 5: Deploy

1. Click "Deploy" in Coolify
2. Monitor the build logs
3. Once deployed, access your app at the assigned URL

## Step 6: Configure Domain (Optional)

### Using Custom Domain

1. In Coolify, go to your application settings
2. Navigate to "Domains" section
3. Add your custom domain (e.g., `music.yourdomain.com`)
4. Update your DNS records to point to your server IP
5. Coolify will automatically handle SSL certificates via Let's Encrypt

### Using Server IP

Access your app at: `http://your-server-ip:assigned-port`

## Troubleshooting

### Build Fails

1. Check build logs in Coolify
2. Verify all environment variables are set correctly
3. Ensure Dockerfile is in the root directory
4. Check that `next.config.mjs` has `output: 'standalone'`

### Application Won't Start

1. Verify PORT environment variable is set to 3000
2. Check container logs in Coolify
3. Ensure Firebase credentials are correct
4. Verify network connectivity to external APIs

### Firebase Connection Issues

1. Add your server IP to Firebase authorized domains
2. Go to Firebase Console → Authentication → Settings → Authorized domains
3. Add your domain or IP address

### Music API Connection Issues

1. Verify PROXY_TARGET_URL is correct
2. Check if your server can reach the external API:
   ```bash
   curl http://102.212.179.119:3000/artists
   ```
3. Check firewall rules on your Ubuntu server

## Manual Docker Deployment (Alternative)

If you prefer to deploy without Coolify:

### Build the Docker image

```bash
docker build -t music-streaming-app .
```

### Run the container

```bash
docker run -d \
  --name music-streaming \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_FIREBASE_API_KEY=your-key \
  -e NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain \
  -e NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id \
  -e NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket \
  -e NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id \
  -e NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id \
  -e GENIUS_ACCESS_TOKEN=your-genius-token \
  -e PROXY_TARGET_URL=http://102.212.179.119:3000 \
  music-streaming-app
```

### Using Docker Compose

Create a `docker-compose.yml` file (already provided) and run:

```bash
docker-compose up -d
```

## Post-Deployment Checklist

- [ ] Application is accessible via browser
- [ ] User registration works
- [ ] User login works
- [ ] Music playback functions correctly
- [ ] Search functionality works
- [ ] Playlists can be created and managed
- [ ] Firebase authentication is working
- [ ] Lyrics feature is operational
- [ ] All API endpoints respond correctly

## Monitoring

### View Logs in Coolify
1. Go to your application in Coolify
2. Click "Logs" tab
3. Monitor real-time application logs

### View Docker Logs (Manual)
```bash
docker logs -f music-streaming
```

## Updating Your Application

1. Push changes to your Git repository
2. In Coolify, click "Redeploy"
3. Coolify will pull latest code and rebuild

## Security Recommendations

1. Use HTTPS with a custom domain
2. Keep Firebase credentials secure
3. Regularly update dependencies
4. Set up firewall rules on Ubuntu
5. Use strong passwords for Coolify admin
6. Enable Firebase security rules
7. Regularly backup Firestore data

## Performance Optimization

1. Enable caching in Coolify
2. Use CDN for static assets
3. Optimize images before upload
4. Monitor resource usage in Coolify dashboard
5. Scale horizontally if needed

## Support

For issues specific to:
- **Coolify**: Check [Coolify Documentation](https://coolify.io/docs)
- **Next.js**: See [Next.js Documentation](https://nextjs.org/docs)
- **Firebase**: Visit [Firebase Documentation](https://firebase.google.com/docs)

---

Your music streaming application should now be successfully deployed on Coolify!
