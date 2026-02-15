# Music Streaming Application

A modern, full-featured music streaming web application built with Next.js 15, React 19, and Firebase. This application provides a Spotify-like experience with features including music playback, user authentication, personalized playlists, and content preferences based on geographical regions.

## Features

### Core Functionality
- **Music Streaming**: Stream music with a custom audio player supporting play, pause, skip, and volume controls
- **User Authentication**: Secure sign-up and sign-in with Firebase Authentication
- **Content Discovery**: Browse artists, albums, tracks, and curated playlists
- **Search**: Powerful search functionality across artists, albums, and tracks
- **Personalized Experience**: Content preferences based on geographical regions (Local, International, Mixed)
- **Favorites & Library**: Save favorite tracks and manage your personal music library
- **Recently Played**: Track and display your listening history
- **Lyrics Integration**: View song lyrics powered by Genius API

### User Interface
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark/Light Theme**: Theme switching with next-themes
- **Modern UI Components**: Built with Radix UI and Tailwind CSS
- **Smooth Animations**: Enhanced user experience with tailwindcss-animate
- **Image Fallbacks**: Graceful handling of missing album artwork

### Content Features
- **Featured Albums**: Curated album recommendations
- **Gospel Music Section**: Dedicated section for gospel and Christian music
- **Trending Tracks**: Discover what's popular
- **New Releases**: Stay updated with the latest music
- **Artist Pages**: Detailed artist profiles with albums and tracks
- **Album Pages**: Full album views with track listings
- **Playlist Management**: Create and manage custom playlists

## Tech Stack

### Frontend
- **Framework**: Next.js 15.2.4 (App Router)
- **React**: 19.x
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Radix UI primitives
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

### Backend Integration
- **API Proxy**: Next.js API routes for backend communication
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage

### Development Tools
- **Package Manager**: pnpm 10.16.0
- **Linting**: ESLint with Next.js configuration
- **Deployment**: Docker support with multi-stage builds

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- pnpm 10.16.0 or higher (or npm/yarn)
- Firebase project with Auth, Firestore, and Storage enabled
- Backend API server running (see PROXY_TARGET_URL configuration)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Frontend-Music
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` with your configuration:
```env
# Application Configuration
NODE_ENV=development
PORT=3001

# API Configuration
API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Backend API Proxy
PROXY_TARGET_URL=http://localhost:3000

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Genius API (for lyrics)
GENIUS_ACCESS_TOKEN=your_genius_token
```

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3001](http://localhost:3001) in your browser

### Building for Production

```bash
pnpm build
pnpm start
```

## Docker Deployment

### Using Docker Compose

1. Configure your environment variables in `.env.local`

2. Build and run with Docker Compose:
```bash
docker-compose up -d
```

The application will be available at `http://localhost:3000`

### Manual Docker Build

```bash
docker build -t music-streaming-app .
docker run -p 3000:3000 --env-file .env.local music-streaming-app
```

## Project Structure

```
Frontend-Music/
├── app/                      # Next.js App Router pages
│   ├── album/               # Album detail pages
│   ├── artist/              # Artist detail pages
│   ├── api/                 # API routes (proxy, config, lyrics)
│   ├── library/             # User library page
│   ├── playlist/            # Playlist pages
│   ├── search/              # Search functionality
│   ├── sign-in/             # Authentication pages
│   └── ...
├── components/              # React components
│   ├── ui/                  # Reusable UI components (Radix UI)
│   ├── header.tsx           # App header
│   ├── sidebar.tsx          # Navigation sidebar
│   ├── music-player.tsx     # Audio player component
│   └── ...
├── contexts/                # React Context providers
│   ├── auth-context.tsx     # Authentication state
│   └── player-context.tsx   # Music player state
├── hooks/                   # Custom React hooks
├── lib/                     # Utility libraries
│   ├── api-client.ts        # API client configuration
│   ├── music-api.ts         # Music API wrapper
│   ├── firebase-service.ts  # Firebase integration
│   └── config.ts            # App configuration
├── public/                  # Static assets
├── Dockerfile               # Docker configuration
├── docker-compose.yml       # Docker Compose setup
└── package.json             # Dependencies and scripts
```

## Key Features Explained

### Content Preferences
Users can customize their music discovery experience by selecting geographical preferences:
- **Local**: Focus on African and local artists
- **International**: Discover music from around the world
- **Mixed**: Balanced mix of local and international content

### Music Player
The custom music player includes:
- Play/pause controls
- Track progress bar with seeking
- Volume control
- Next/previous track navigation
- Queue management
- Shuffle and repeat modes

### API Proxy
The application uses Next.js API routes to proxy requests to the backend API, providing:
- CORS handling
- Request/response transformation
- Error handling
- Secure credential management

## Available Scripts

- `pnpm dev` - Start development server on port 3001
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment mode (development/production) | Yes |
| `PORT` | Application port | Yes |
| `API_BASE_URL` | Frontend API base URL | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |
| `PROXY_TARGET_URL` | Backend API URL | Yes |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase configuration | Yes |
| `GENIUS_ACCESS_TOKEN` | Genius API token for lyrics | Optional |

## Deployment

For detailed deployment instructions, see:
- `COOLIFY_DEPLOYMENT.md` - Coolify deployment guide
- `COOLIFY_LOCAL_DEPLOYMENT.md` - Local Coolify setup
- `DEPLOY_LOCAL.md` - Local deployment instructions
- `DEPLOYMENT_SUMMARY.md` - General deployment overview

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the repository.
