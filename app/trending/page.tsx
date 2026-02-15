"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Play, Heart, MoreHorizontal, Loader2, ChevronLeft, Music, Download, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePlayer } from "@/contexts/player-context"
import { useAuth } from "@/contexts/auth-context"
import { Sidebar } from "@/components/sidebar"
import { musicAPI, Track } from "@/lib/music-api"
import { TruncatedArtists } from "@/components/ui/truncated-artists"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function TrendingPage() {
  const player = usePlayer()
  const { favoriteTrackIds, addToFavorites, removeFromFavorites } = useAuth()
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const lastFocusReloadAt = useRef(0)

  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async (pageNum = 1) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/proxy/tracks?sort=popularity&order=desc&limit=50&page=${pageNum}`)
      const data = await response.json()
      
      // Add album images to tracks
      const tracksWithImages = await Promise.all(
        (data.data || []).map(async (track: Track) => {
          try {
            const album = await musicAPI.getAlbum(track.album_id)
            return {
              ...track,
              album_images: album.images || []
            }
          } catch (error) {
            return track
          }
        })
      )
      
      if (pageNum === 1) {
        setTracks(tracksWithImages)
      } else {
        setTracks(prev => {
          // Deduplicate tracks by ID to prevent duplicate key errors
          const existingIds = new Set(prev.map(track => track.id))
          const newTracks = tracksWithImages.filter(track => !existingIds.has(track.id))
          return [...prev, ...newTracks]
        })
      }
      
      setHasMore(data.pagination?.page < data.pagination?.pages)
      setPage(pageNum)
      if ((tracksWithImages || []).length === 0 && pageNum === 1) scheduleRetry()
    } catch (error) {
      console.error("Error loading trending tracks:", error)
      if (pageNum === 1) scheduleRetry()
    } finally {
      setIsLoading(false)
    }
  }

  const clearRetry = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = null
  }

  const scheduleRetry = () => {
    if (retryCount >= 20) return
    clearRetry()
    const delay = Math.min(15000, 2000 * Math.pow(1.4, retryCount))
    retryTimer.current = setTimeout(() => {
      setRetryCount(c => c + 1)
      loadTracks(1)
    }, delay)
  }

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadTracks(page + 1)
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
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
  }

  const handleShareTrack = (track: Track) => {
    const trackInfo = `${track.name} by ${track.artists?.join(', ') || 'Unknown Artist'}`
    navigator.clipboard.writeText(trackInfo).then(() => {
      console.log('Track info copied to clipboard:', trackInfo)
    }).catch(() => {
      console.log('Failed to copy track info')
    })
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] text-white overflow-hidden relative">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 animate-gradient-xy -z-10">
        {/* Animated gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-800/30 via-indigo-800/30 to-blue-800/30 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-slate-800/20 via-gray-800/20 to-zinc-800/20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-violet-800/25 via-purple-800/25 to-indigo-800/25 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating geometric elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-purple-600/15 to-indigo-600/15 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-r from-blue-600/15 to-cyan-600/15 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-r from-violet-600/15 to-purple-600/15 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-gradient-to-r from-indigo-600/15 to-blue-600/15 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      
      <Sidebar />
      <main className="flex-1 overflow-auto relative z-0">
        <div className="px-4 sm:px-6 md:px-8 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hidden sm:flex rounded-full h-10 w-10">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-black mb-2">Trending Now</h1>
              <p className="text-zinc-400">The hottest tracks right now</p>
            </div>
          </div>

          {/* Tracks List */}
          {tracks.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg">
                  <div className="w-8 text-right">
                    <Skeleton className="h-4 w-4 ml-auto" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-2/3 mb-2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <div className="hidden md:block w-16">
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <div className="hidden md:block w-24">
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <div className="w-12 text-right">
                    <Skeleton className="h-3 w-10 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {tracks.map((track, index) => {
                  const isLiked = favoriteTrackIds.includes(track.id)
                  const isPlaying = player.current?.id === track.id

                  return (
                    <div
                      key={track.id}
                      className="group flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => player.play(track, { queue: tracks, autoplay: true })}
                    >
                      <div className="w-8 text-right text-zinc-400 text-sm font-medium">
                        <span className={`group-hover:hidden ${isPlaying ? 'text-green-500' : ''}`}>
                          {index + 1}
                        </span>
                        <Play className="h-4 w-4 hidden group-hover:block text-white" />
                      </div>
                      
                      <div className="relative w-12 h-12 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
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
                      
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${isPlaying ? 'text-green-500' : 'text-white'}`}>
                          {track.name}
                        </div>
                        <TruncatedArtists 
                          artists={track.artists}
                          artistIds={track.artist_ids as any}
                          maxLength={25}
                          showLinks={true}
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        />
                      </div>
                      
                      <div className="hidden md:block text-sm text-zinc-400">
                        {track.popularity}/100
                      </div>
                      
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
                              onClick={(e) => {
                                e.stopPropagation()
                                handleShareTrack(track)
                              }}
                            >
                              <Share2 className="h-4 w-4" />
                              Share Track
                            </DropdownMenuItem>
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
                      
                      <div className="text-sm text-zinc-400 w-12 text-right">
                        {formatDuration(track.duration_ms)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="bg-white text-black hover:bg-white/90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
