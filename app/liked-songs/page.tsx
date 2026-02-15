"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Play, Pause, Clock, Heart, MoreHorizontal, Music, Loader2, Download, Share2, ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { usePlayer } from "@/contexts/player-context"
import { useAuth } from "@/contexts/auth-context"
import { musicAPI, Track } from "@/lib/music-api"
import { TruncatedArtists } from "@/components/ui/truncated-artists"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength) + '...'
}

export default function LikedSongsPage() {
  const player = usePlayer()
  const { user, isLoading, favoriteTrackIds, removeFromFavorites } = useAuth()
  const router = useRouter()
  const [likedTracks, setLikedTracks] = useState<Track[]>([])
  const [isLoadingTracks, setIsLoadingTracks] = useState(false)

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in")
    }
  }, [user, isLoading, router])

  // Load liked tracks data
  useEffect(() => {
    const loadLikedTracks = async () => {
      if (favoriteTrackIds.length === 0) {
        setLikedTracks([])
        return
      }

      setIsLoadingTracks(true)
      try {
        // Fetch track details for each favorite track ID
        const trackPromises = favoriteTrackIds.map(trackId => 
          musicAPI.getTrack(trackId).catch(() => null)
        )
        const trackResults = await Promise.all(trackPromises)
        const validTracks = trackResults.filter(track => track !== null) as Track[]
        
        // Fetch album images for tracks to display them
        try {
          const tracksWithImages = await Promise.all(
            validTracks.map(async (track) => {
              try {
                const album = await musicAPI.getAlbum(track.album_id)
                return {
                  ...track,
                  album_images: album.images || []
                }
              } catch (error) {
                // If album fetch fails, return track without images
                return track
              }
            })
          )
          setLikedTracks(tracksWithImages)
        } catch (error) {
          // If fetching album images fails, use tracks without images
          console.warn('Failed to fetch album images for liked tracks:', error)
          setLikedTracks(validTracks)
        }
      } catch (error) {
        console.error('Error loading liked tracks:', error)
        setLikedTracks([])
      } finally {
        setIsLoadingTracks(false)
      }
    }

    loadLikedTracks()
  }, [favoriteTrackIds])

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleDownloadTrack = (track: Track) => {
    // Use the actual download API endpoint
    const downloadUrl = `/api/proxy/download/${track.id}`
    
    // Create a temporary link element to trigger download
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${track.name} - ${track.artists?.join(', ') || 'Unknown Artist'}.mp3`
    link.target = '_blank'
    
    // Append to body, click, and remove safely
    document.body.appendChild(link)
    link.click()
    
    // Use setTimeout to ensure the click event completes before removal
    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link)
      }
    }, 100)
    
    console.log('Download started for track:', track.name)
  }

  const handleShareTrack = (track: Track) => {
    try {
      const url = `${window.location.origin}/album/${track.album_id}?track=${track.id}`
      navigator.clipboard.writeText(url)
    } catch {}
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="bg-gradient-to-b from-pink-900 to-black">
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end gap-6">
              <div className="w-48 h-48 bg-gradient-to-br from-pink-600 to-purple-700 flex items-center justify-center shadow-xl">
                <Skeleton className="h-24 w-24 rounded" />
              </div>
              <div className="w-full max-w-xl">
                <Skeleton className="h-4 w-16 mb-3" />
                <Skeleton className="h-10 w-64 md:w-96 mb-3" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-6 mb-8">
                <Skeleton className="h-14 w-14 rounded-full" />
              </div>
              <div className="w-full">
                <div className="text-zinc-400 text-left border-b border-zinc-800 text-sm grid grid-cols-[3rem_1fr_12rem_6rem] pr-4">
                  <div className="pb-3 pl-4">#</div>
                  <div className="pb-3">Title</div>
                  <div className="pb-3 hidden md:block">Album</div>
                  <div className="pb-3 text-right">Time</div>
                </div>
                <div>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="grid grid-cols-[3rem_1fr_12rem_6rem] items-center py-3 pr-4 border-b border-transparent">
                      <div className="pl-4"><Skeleton className="h-4 w-4" /></div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded" />
                        <div className="flex-1 min-w-0">
                          <Skeleton className="h-4 w-2/3 mb-2" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                      <div className="hidden md:block"><Skeleton className="h-3 w-20" /></div>
                      <div className="text-right"><Skeleton className="h-3 w-10 ml-auto" /></div>
                    </div>
                  ))}
                </div>
              </div>
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
        <div className="bg-gradient-to-b from-pink-900 to-black">
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="w-48 h-48 bg-gradient-to-br from-pink-600 to-purple-700 flex items-center justify-center shadow-xl">
              <Heart className="h-24 w-24 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase font-medium">Playlist</p>
              <h1 className="text-3xl md:text-5xl font-bold mt-2 mb-4">Liked Songs</h1>
              <div className="text-sm text-zinc-400">
                <span className="font-medium text-white">{user.displayName || 'User'}</span> • {favoriteTrackIds.length} songs
              </div>
            </div>
          </div>

            {/* Back button positioned above play button */}
            <div className="p-6">
              <Button
                variant="ghost"
                className="hidden sm:flex rounded-full h-10 px-4 bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white border border-white/20 items-center gap-2"
                onClick={() => window.history.back()}
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Previous</span>
              </Button>
            </div>

          <div className="p-6 md:p-8">
            {favoriteTrackIds.length > 0 ? (
              <>


                
                <div className="flex items-center gap-6 mb-8">
                  <Button
                    size="icon"
                    className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600 text-black shadow-lg"
                    onClick={() => likedTracks.length && player.play(likedTracks[0], { queue: likedTracks, autoplay: true })}
                  >
                    <Play className="h-7 w-7" />
                  </Button>
                </div>

                {isLoadingTracks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mr-3" />
                    <span className="text-zinc-400">Loading liked tracks...</span>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-zinc-400 text-left border-b border-zinc-800 text-sm">
                        <th className="pb-3 pl-4 w-12">#</th>
                        <th className="pb-3">Title</th>
                        <th className="pb-3 hidden md:table-cell">Album</th>
                        <th className="pb-3 text-right pr-4">
                          <Clock className="h-4 w-4 inline" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {likedTracks.map((track, index) => {
                        const isCurrent = player.current?.id === track.id
                        return (
                        <tr key={track.id} className={`group text-sm ${isCurrent ? 'bg-white/5' : 'hover:bg-zinc-800/50'}`}>
                          <td className="py-3 pl-4">
                            {!isCurrent && (
                              <span className="group-hover:hidden">{index + 1}</span>
                            )}
                            {isCurrent ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 text-green-500 hover:text-green-400"
                                onClick={() => (player.isPlaying ? player.pause() : player.resume())}
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
                                className="h-6 w-6 p-0 hidden group-hover:inline-flex text-zinc-400 hover:text-white"
                                onClick={() => player.play(track, { queue: likedTracks, autoplay: true })}
                                aria-label="Play"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 bg-zinc-700 rounded flex items-center justify-center overflow-hidden group/image">
                                {track.album_images && track.album_images.length > 0 ? (
                                  <Image
                                    src={track.album_images[0].url}
                                    alt={track.name}
                                    width={40}
                                    height={40}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <Music className="h-5 w-5 text-zinc-400" />
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => player.play(track, { queue: likedTracks, autoplay: true })}
                                  >
                                    <Play className="h-3 w-3 text-black" />
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <p className={`font-medium ${isCurrent ? 'text-green-500' : ''}`}>{truncateText(track.name, 30)}</p>
                                <TruncatedArtists 
                                  artists={track.artists}
                                  artistIds={(track as any).artist_ids}
                                  maxLength={20}
                                  className="text-zinc-400 text-xs"
                                  showLinks={true}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 hidden md:table-cell text-zinc-400">
                            Track #{track.track_number}
                          </td>
                          <td className="py-3 text-right pr-4 text-zinc-400">
                            <div className="flex items-center justify-end gap-3">
                              <div className="opacity-0 group-hover:opacity-100">
                                {isCurrent ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-500 hover:text-green-400"
                                    onClick={() => (player.isPlaying ? player.pause() : player.resume())}
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
                                    className="h-8 w-8 text-zinc-400 hover:text-white"
                                    onClick={() => player.play(track, { queue: likedTracks, autoplay: true })}
                                    aria-label="Play"
                                  >
                                    <Play className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/20"
                                onClick={() => removeFromFavorites(track.id)}
                              >
                                <Heart className="h-4 w-4 fill-current" />
                              </Button>
                              <span>{formatDuration(track.duration_ms)}</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white"
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
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <div className="bg-zinc-900/50 rounded-xl p-8 text-center">
                <Music className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No liked songs yet</h3>
                <p className="text-zinc-400 mb-4">Start adding songs to your liked songs by clicking the heart icon</p>
                <Button onClick={() => router.push("/")}>Discover Music</Button>
              </div>
            )}
          </div>
        </div>
      </main>
      {/* Global MusicPlayer is rendered in app/layout.tsx */}
    </div>
  )
}
