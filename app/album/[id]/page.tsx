"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Play, Pause, Clock, Heart, MoreHorizontal, Loader2, Download, Share2, Music, ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { usePlayer } from "@/contexts/player-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { musicAPI, Album, Track } from "@/lib/music-api"
import { formatDate, formatAlbumInfo } from "@/lib/date-utils"
import { TruncatedArtists } from "@/components/ui/truncated-artists"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const player = usePlayer()
  const { user, favoriteTrackIds, addToFavorites, removeFromFavorites, likedAlbumIds, likeAlbum, unlikeAlbum } = useAuth()
  const { toast } = useToast()
  const [album, setAlbum] = useState<Album | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [albumId, setAlbumId] = useState<string | null>(null)
  const [startTrackId, setStartTrackId] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Resolve params first
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setAlbumId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!albumId) return

    const loadAlbumData = async () => {
      try {
        setIsLoading(true)
        const [albumData, tracksData] = await Promise.all([
          musicAPI.getAlbum(albumId),
          musicAPI.getAlbumTracks(albumId)
        ])
        
        // Add album images and ensure artists array exists for each track
        const albumArtist = (albumData as any)?.artists?.[0]?.name || undefined
        const tracksWithImages = tracksData.map(track => ({
          ...track,
          artists: (track.artists && track.artists.length > 0) ? track.artists : (albumArtist ? [albumArtist] : track.artists),
          album_images: albumData.images || []
        }))
        try { console.debug('[Album] tracks enriched', { count: tracksWithImages.length, albumArtist }) } catch {}
        
        setAlbum(albumData)
        setTracks(tracksWithImages)

        // If query includes ?track=xyz, auto-play that track
        try {
          const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
          const qTrack = qs?.get('track') || null
          setStartTrackId(qTrack)
          if (qTrack) {
            const startIdx = tracksWithImages.findIndex(t => t.id === qTrack)
            if (startIdx >= 0) {
              player.play(tracksWithImages[startIdx], { queue: tracksWithImages, autoplay: true })
            }
          }
        } catch {}
      } catch (err) {
        console.error('Error loading album:', err)
        setError('Failed to load album data')
      } finally {
        setIsLoading(false)
      }
    }

    loadAlbumData()
  }, [albumId])

  // Background slideshow effect
  useEffect(() => {
    if (!album || !album.images || album.images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === album.images.length - 1 ? 0 : prevIndex + 1
      )
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [album])

  const handlePlayAlbum = () => {
    if (tracks.length > 0) {
      player.play(tracks[0], { queue: tracks, autoplay: true })
    }
  }

  const handlePlayTrack = (track: Track, index: number) => {
    player.play(track, { queue: tracks, autoplay: true })
  }

  const handleLikeAlbum = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like albums",
        variant: "destructive",
      })
      return
    }

    if (!album) return

    try {
      if (likedAlbumIds.includes(album.id)) {
        await unlikeAlbum(album.id)
        toast({
          title: "Album unliked",
          description: `"${album.name}" has been removed from your liked albums`,
        })
      } else {
        await likeAlbum(album.id)
        toast({
          title: "Album liked",
          description: `"${album.name}" has been added to your liked albums`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update album like status",
        variant: "destructive",
      })
    }
  }

  const handleDownloadTrack = (track: Track) => {
    const downloadUrl = `/api/proxy/download/${track.id}`
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${track.name} - ${track.artists?.join(', ') || 'Unknown Artist'}.mp3`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download started",
      description: `Downloading "${track.name}"`,
    })
  }

  const handleShareAlbum = () => {
    if (!album) return
    
    const url = `${window.location.origin}/album/${album.id}`
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied",
        description: "Album link copied to clipboard",
      })
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      })
    })
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] text-white overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 overflow-auto relative z-0">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
              {/* Album cover skeleton */}
              <div className="w-full lg:w-1/3">
                <Skeleton className="w-full aspect-square rounded-lg" />
              </div>
              {/* Album info skeleton */}
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-3">
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-12" />
                  <Skeleton className="h-12 w-12" />
                </div>
              </div>
            </div>
            {/* Tracks skeleton */}
            <div className="mt-8 space-y-3">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="flex h-[calc(100vh-5rem)] text-white overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 overflow-auto relative z-0">
          <div className="p-3 sm:p-4 md:p-6 text-center">
            <div className="py-12 sm:py-16">
              <Music className="h-16 w-16 sm:h-20 sm:w-20 text-zinc-600 mx-auto mb-4" />
              <h1 className="text-xl sm:text-2xl font-semibold text-zinc-300 mb-2">
                {error || 'Album not found'}
              </h1>
              <p className="text-zinc-500 text-sm sm:text-base">
                {error || 'The album you\'re looking for doesn\'t exist or has been removed.'}
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const isLiked = likedAlbumIds.includes(album.id)
  const isCurrentTrack = (trackId: string) => player.current?.id === trackId
  const isPlaying = (trackId: string) => isCurrentTrack(trackId) && player.isPlaying

  return (
    <div className="flex h-[calc(100vh-5rem)] text-white overflow-hidden relative">
      {/* Dynamic Background with Album Cover */}
      <div className="absolute inset-0 -z-10">
        {album.images && album.images.length > 0 && (
          <Image
            src={album.images[0].url}
            alt={album.name}
            fill
            className="object-cover "
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" />
      </div>
      
      <Sidebar />
      <main className="flex-1 overflow-auto relative z-0">
        {/* Back button */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:left-8 z-10">
          <Button
            variant="ghost"
            className="hidden sm:flex rounded-full h-10 px-4 bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white border border-white/20 items-center gap-2"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Previous</span>
          </Button>
        </div>
        
        <div className="p-3 sm:p-4 md:p-6">
          {/* Album Header */}
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 mb-6 sm:mb-8">
            {/* Album Cover */}
            <div className="w-full lg:w-1/3 flex justify-center lg:justify-start">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-lg overflow-hidden shadow-2xl">
                {album.images && album.images.length > 0 ? (
                  <Image
                    src={album.images[0].url}
                    alt={album.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-6xl sm:text-8xl">
                    🎵
                  </div>
                )}
              </div>
            </div>

            {/* Album Info */}
            <div className="flex-1 flex flex-col justify-center space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4 text-white drop-shadow-lg">
                  {album.name}
                </h1>
                <TruncatedArtists 
                  artists={album.artists}
                  artistIds={album.artist_ids}
                  maxLength={40}
                  className="text-lg sm:text-xl md:text-2xl text-zinc-200 mb-2 sm:mb-4 drop-shadow-lg"
                  showLinks={true}
                />
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base text-zinc-300">
                  {album.release_date && (
                    <span>{formatDate(album.release_date, 'full')}</span>
                  )}
                  {album.total_tracks && (
                    <>
                      <span>•</span>
                      <span>{album.total_tracks} tracks</span>
                    </>
                  )}
                  {album.genres && album.genres.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{album.genres.slice(0, 3).join(', ')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <Button
                  size="lg"
                  className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg"
                  onClick={handlePlayAlbum}
                >
                  <Play className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  Play Album
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-12 w-12 sm:h-14 sm:w-14 border-2 ${isLiked ? 'text-red-500 border-red-500' : 'text-white border-white'}`}
                  onClick={handleLikeAlbum}
                >
                  <Heart className={`h-6 w-6 sm:h-7 sm:w-7 ${isLiked ? 'fill-current' : ''}`} />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-white text-white"
                  onClick={handleShareAlbum}
                >
                  <Share2 className="h-6 w-6 sm:h-7 sm:w-7" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tracks List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Tracks</h2>
              <span className="text-sm sm:text-base text-zinc-400">
                {tracks.length} track{tracks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {tracks.map((track, index) => {
              const isLiked = favoriteTrackIds.includes(track.id)
              const isCurrent = isCurrentTrack(track.id)
              const isTrackPlaying = isPlaying(track.id)

              return (
                <div
                  key={track.id}
                  className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${
                    isCurrent ? 'bg-white/20' : ''
                  }`}
                  onClick={() => handlePlayTrack(track, index)}
                >
                  {/* Track Number / Play Button */}
                  <div className="w-8 sm:w-10 text-center">
                    {isCurrent ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10 text-green-500 hover:text-green-400"
                        onClick={(e) => { e.stopPropagation(); player.isPlaying ? player.pause() : player.resume() }}
                      >
                        {isTrackPlaying ? (
                          <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </Button>
                    ) : (
                      <span className="text-sm sm:text-base text-zinc-400 group-hover:hidden">
                        {index + 1}
                      </span>
                    )}
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10 text-white hidden group-hover:inline-flex"
                        onClick={(e) => { e.stopPropagation(); handlePlayTrack(track, index) }}
                      >
                        <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    )}
                  </div>

                  {/* Track Cover */}
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                    {track.album_images && track.album_images.length > 0 ? (
                      <Image
                        src={track.album_images[0].url}
                        alt={track.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <Music className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-sm sm:text-base truncate mb-1 ${
                      isCurrent ? 'text-green-500' : 'text-white'
                    }`}>
                      {track.name}
                    </h3>
                    <TruncatedArtists 
                      artists={track.artists}
                      artistIds={track.artist_ids}
                      maxLength={25}
                      className="text-xs sm:text-sm text-zinc-400 truncate"
                      showLinks={true}
                      onClick={(e) => { e.stopPropagation() }}
                    />
                  </div>

                  {/* Track Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 sm:h-10 sm:w-10 ${isLiked ? "text-red-500" : "text-zinc-400 hover:text-white"}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isLiked) {
                          removeFromFavorites(track.id)
                        } else {
                          addToFavorites(track.id)
                        }
                      }}
                    >
                      <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${isLiked ? "fill-current" : ""}`} />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-400 hover:text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-40 sm:w-48 bg-zinc-800 border-zinc-700 text-white">
                        <DropdownMenuItem 
                          className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadTrack(track)
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Track Duration */}
                  <div className="text-xs sm:text-sm text-zinc-400 w-12 sm:w-16 text-right">
                    {formatDuration(track.duration_ms)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
