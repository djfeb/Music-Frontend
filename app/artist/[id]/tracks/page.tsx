"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Play, Pause, Clock, Heart, MoreHorizontal, Loader2, Music, Download, Share2, ArrowLeft, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { usePlayer } from "@/contexts/player-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { musicAPI, Artist, Track } from "@/lib/music-api"
import { TruncatedArtists } from "@/components/ui/truncated-artists"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ArtistTracksPage({ params }: { params: Promise<{ id: string }> }) {
  const player = usePlayer()
  const { user, favoriteTrackIds, addToFavorites, removeFromFavorites } = useAuth()
  const { toast } = useToast()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [artistId, setArtistId] = useState<string | null>(null)
  const [trackPlayCounts, setTrackPlayCounts] = useState<Record<string, number>>({})
  const [playingTrackStartTime, setPlayingTrackStartTime] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  // Resolve params first
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setArtistId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!artistId) return

    const loadArtistData = async () => {
      try {
        setIsLoading(true)
        const [artistData, tracksData] = await Promise.all([
          musicAPI.getArtist(artistId),
          musicAPI.getArtistTracks(artistId)
        ])
        setArtist(artistData)
        
        // Add album images to tracks for display
        try {
          const tracksWithImages = await Promise.all(
            tracksData.map(async (track) => {
              try {
                const album = await musicAPI.getAlbum(track.album_id)
                return {
                  ...track,
                  // Ensure artists array exists for downstream features (lyrics)
                  artists: (track.artists && track.artists.length > 0) ? track.artists : [artistData.name],
                  album_images: album.images || []
                }
              } catch (error) {
                // If album fetch fails, return track without images but ensure artists fallback
                return {
                  ...track,
                  artists: (track.artists && track.artists.length > 0) ? track.artists : [artistData.name],
                }
              }
            })
          )
          setTracks(tracksWithImages)
        } catch (error) {
          // If fetching album images fails, use tracks without images and ensure artists fallback
          console.warn('Failed to fetch album images for artist tracks:', error)
          setTracks(tracksData.map((t) => ({
            ...t,
            artists: (t.artists && t.artists.length > 0) ? t.artists : [artistData.name],
          })))
        }
      } catch (err) {
        console.error('Error loading artist tracks:', err)
        setError('Failed to load artist tracks')
      } finally {
        setIsLoading(false)
      }
    }

    loadArtistData()
  }, [artistId])

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Filter tracks based on search query
  const filteredTracks = tracks.filter(track => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      track.name.toLowerCase().includes(query) ||
      track.artists?.some(artist => artist.toLowerCase().includes(query))
    )
  })

  const handleDownloadTrack = (track: Track) => {
    // Use the actual download API endpoint
    const downloadUrl = `/api/proxy/download/${track.id}`
    
    // Create a temporary link element to trigger download
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${track.name} - ${track.artists?.join(', ') || 'Unknown Artist'}.mp3`
    link.target = '_blank'
    
    // Append to body, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    console.log('Download started for track:', track.name)
  }

  const handleShareTrack = (track: Track) => {
    try {
      const url = `${window.location.origin}/album/${track.album_id}?track=${track.id}`
      navigator.clipboard.writeText(url).then(() => {
        console.log('Album deep-link copied to clipboard:', url)
      }).catch(() => {
        console.log('Failed to copy album link')
      })
    } catch {}
  }

  // Initialize play counts for tracks
  useEffect(() => {
    if (tracks.length > 0) {
      const initialCounts: Record<string, number> = {}
      tracks.forEach(track => {
        // Generate stable initial play count using track ID as seed
        const seed = track.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        initialCounts[track.id] = Math.floor(seed % 1000000000) + 100000000 // 100M to 1B range
      })
      setTrackPlayCounts(initialCounts)
    }
  }, [tracks])

  // Track play count increases for currently playing track
  useEffect(() => {
    if (player.current && player.isPlaying) {
      if (!playingTrackStartTime) {
        setPlayingTrackStartTime(Date.now())
      }
      
      const interval = setInterval(() => {
        setTrackPlayCounts(prev => ({
          ...prev,
          [player.current!.id]: (prev[player.current!.id] || 0) + Math.floor(Math.random() * 3) + 1
        }))
      }, 2000) // Increase every 2 seconds
      
      return () => clearInterval(interval)
    } else {
      setPlayingTrackStartTime(null)
    }
  }, [player.current, player.isPlaying, playingTrackStartTime])

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {/* Sticky header skeleton */}
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
            <div className="flex items-center gap-4 p-4 sm:p-6">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>

          {/* Tracks list skeleton */}
          <div className="p-4 sm:p-6">
            <div className="space-y-1">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-4 p-2 rounded-md">
                  {/* Index / Play */}
                  <div className="w-4 text-right">
                    <Skeleton className="h-4 w-4 inline-block" />
                  </div>
                  {/* Image */}
                  <Skeleton className="h-12 w-12 rounded" />
                  {/* Texts */}
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-2/3 mb-2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  {/* Play count */}
                  <div className="hidden md:block w-20">
                    <Skeleton className="h-4 w-full" />
                  </div>
                  {/* Actions */}
                  <div className="w-20 flex items-center justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  {/* Duration */}
                  <div className="w-12 text-right">
                    <Skeleton className="h-3 w-10 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !artist) {
    return (
      <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Artist Not Found</h1>
              <p className="text-zinc-400">{error || 'The artist you are looking for does not exist.'}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
          <div className="flex items-center gap-4 p-4 sm:p-6">
            <Link href={`/artist/${artistId}`}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold">{artist.name}</h1>
              <p className="text-sm text-zinc-400">
                {searchQuery ? `${filteredTracks.length} of ${tracks.length}` : tracks.length} songs
              </p>
            </div>
            
            {/* Expandable Search */}
            <div className="flex items-center gap-2">
              {isSearchExpanded ? (
                <div className="relative animate-in slide-in-from-right duration-200">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Search in songs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-64 pl-10 pr-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-green-500"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-400 hover:text-white"
                    onClick={() => {
                      setSearchQuery("")
                      setIsSearchExpanded(false)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-zinc-400 hover:text-white"
                  onClick={() => setIsSearchExpanded(true)}
                >
                  <Search className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="p-4 sm:p-6">
          {filteredTracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 text-lg">No tracks found</p>
              {searchQuery && (
                <p className="text-zinc-500 text-sm mt-2">
                  Try adjusting your search query
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTracks.map((track, index) => {
              const isLiked = favoriteTrackIds.includes(track.id)
              const isCurrent = player.current?.id === track.id

              return (
                <div 
                  key={track.id} 
                  className="group flex items-center gap-4 p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => player.play(track, { queue: tracks, autoplay: true })}
                >
                  {/* Track number / Play button */}
                  <div className="w-4 text-right text-zinc-400 text-sm font-medium">
                    {!isCurrent && (
                      <span className="group-hover:hidden">{index + 1}</span>
                    )}
                    {isCurrent ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 text-green-500 hover:text-green-400"
                        onClick={(e) => { e.stopPropagation(); player.isPlaying ? player.pause() : player.resume() }}
                        aria-label={player.isPlaying ? 'Pause' : 'Play'}
                      >
                        {player.isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hidden group-hover:inline-flex text-white"
                        onClick={(e) => { e.stopPropagation(); player.play(track, { queue: tracks, autoplay: true }) }}
                        aria-label="Play"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Track image */}
                  <div className="relative w-12 h-12 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                    {track.album_images && track.album_images.length > 0 ? (
                      <Image
                        src={track.album_images[0].url}
                        alt={track.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-6 w-6 text-zinc-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${isCurrent ? 'text-green-500' : 'text-white'}`}>
                      {track.name}
                    </div>
                    <TruncatedArtists 
                      artists={track.artists}
                      maxLength={25}
                    />
                  </div>
                  
                  {/* Play count */}
                  <div className="hidden md:block text-sm text-zinc-400">
                    {(trackPlayCounts[track.id] || 0).toLocaleString()}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${isLiked ? "text-green-500" : "text-zinc-400 hover:text-white"}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isLiked) {
                          removeFromFavorites(track.id)
                        } else {
                          addToFavorites(track.id)
                        }
                      }}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48 bg-zinc-800 border-zinc-700 text-white">
                        <DropdownMenuItem 
                          className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700"
                          onClick={() => handleShareTrack(track)}
                        >
                          <Share2 className="h-4 w-4" />
                          Share Track
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700"
                          onClick={() => handleDownloadTrack(track)}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Duration */}
                  <div className="text-sm text-zinc-400 w-12 text-right">
                    {formatDuration(track.duration_ms)}
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </div>
      </main>
    </div>
  )
}
