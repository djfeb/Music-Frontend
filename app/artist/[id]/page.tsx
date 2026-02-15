"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Play, Pause, Clock, Heart, MoreHorizontal, Loader2, Disc3, Music, Download, Share2, Shuffle, ChevronRight, Verified, ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { usePlayer } from "@/contexts/player-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { musicAPI, Artist, Album, Track } from "@/lib/music-api"
import { formatAlbumInfo } from "@/lib/date-utils"
import { TruncatedArtists } from "@/components/ui/truncated-artists"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const player = usePlayer()
  const { user, favoriteTrackIds, addToFavorites, removeFromFavorites, followedArtistIds, followArtist, unfollowArtist } = useAuth()
  const { toast } = useToast()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [albums, setAlbums] = useState<Album[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [relatedArtists, setRelatedArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [artistId, setArtistId] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [displayedTracks, setDisplayedTracks] = useState(5)
  const [monthlyListeners, setMonthlyListeners] = useState<number | null>(null)
  const [trackPlayCounts, setTrackPlayCounts] = useState<Record<string, number>>({})
  const [playingTrackStartTime, setPlayingTrackStartTime] = useState<number | null>(null)



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
        const [artistData, albumsData, tracksData] = await Promise.all([
          musicAPI.getArtist(artistId),
          musicAPI.getArtistAlbums(artistId),
          musicAPI.getArtistTracks(artistId)
        ])
        setArtist(artistData)
        setAlbums(albumsData)
        
        // Load related artists based on exact genre matches
        try {
          if (artistData.genres && artistData.genres.length > 0) {
            // Fetch multiple pages of artists to get a comprehensive sample
            const allArtistsMap = new Map<string, Artist>() // Use Map to avoid duplicates
            
            // Fetch multiple pages to get more artists
            for (let page = 1; page <= 5; page++) {
              try {
                const artistsResponse = await musicAPI.getArtists({
                  page: page,
                  limit: 100,
                  sort: 'popularity',
                  order: 'desc'
                })
                
                // Add artists to map (Map automatically handles duplicates by ID)
                artistsResponse.data.forEach(artist => {
                  allArtistsMap.set(artist.id, artist)
                })
                
                // Stop if we've reached the end
                if (artistsResponse.data.length < 100) break
              } catch (error) {
                console.warn(`Failed to fetch artists page ${page}:`, error)
                break
              }
            }
            
            // Convert Map to array
            const allArtists = Array.from(allArtistsMap.values())
            
            // Find artists that have exact genre matches
            const artistsWithExactGenreMatches = allArtists
              .filter(relatedArtist => 
                relatedArtist.id !== artistId && 
                relatedArtist.genres && 
                relatedArtist.genres.length > 0
              )
              .map(relatedArtist => {
                // Find exact genre matches (case-insensitive)
                const matchingGenres = relatedArtist.genres.filter(relatedGenre => 
                  artistData.genres.some(currentGenre => 
                    relatedGenre.toLowerCase().trim() === currentGenre.toLowerCase().trim()
                  )
                )
                
                return {
                  artist: relatedArtist,
                  matchingGenres: matchingGenres,
                  matchCount: matchingGenres.length
                }
              })
              .filter(item => item.matchCount > 0) // Only include artists with at least one exact genre match
              .sort((a, b) => {
                // Sort by number of matching genres first, then by popularity
                if (b.matchCount !== a.matchCount) {
                  return b.matchCount - a.matchCount
                }
                return (b.artist.popularity || 0) - (a.artist.popularity || 0)
              })
            
            // Take the top 6 related artists
            setRelatedArtists(artistsWithExactGenreMatches.slice(0, 6).map(item => item.artist))
            
            console.log(`Found ${artistsWithExactGenreMatches.length} artists with matching genres for:`, artistData.genres)
          } else {
            // Fallback: get popular artists if no genres available
            const popularArtistsResponse = await musicAPI.getArtists({
              limit: 6,
              sort: 'popularity',
              order: 'desc'
            })
            setRelatedArtists(popularArtistsResponse.data.filter(a => a.id !== artistId))
          }
        } catch (error) {
          console.warn('Failed to load related artists:', error)
          setRelatedArtists([])
        }
        
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
        console.error('Error loading artist:', err)
        setError('Failed to load artist data')
      } finally {
        setIsLoading(false)
      }
    }

    loadArtistData()
  }, [artistId])

  // Background slideshow effect
  useEffect(() => {
    if (!artist || !artist.images || artist.images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === artist.images.length - 1 ? 0 : prevIndex + 1
      )
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [artist])

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

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5)
      player.playQueue(shuffledTracks, 0)
      toast({
        title: "Shuffle Play",
        description: `Playing ${artist?.name} on shuffle`,
      })
    }
  }

  const handleFollowToggle = async () => {
    if (!user || !artistId) return
    
    const isFollowing = followedArtistIds.includes(artistId)
    
    try {
      if (isFollowing) {
        await unfollowArtist(artistId)
        toast({
          title: "Unfollowed",
          description: `You unfollowed ${artist?.name}`,
        })
      } else {
        await followArtist(artistId)
        toast({
          title: "Following",
          description: `You are now following ${artist?.name}`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      })
    }
  }

  // Generate stable mock monthly listeners based on followers
  useEffect(() => {
    if (artist?.followers_total && !monthlyListeners) {
      // Generate stable monthly listeners using artist ID as seed
      const seed = artist.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const multiplier = 1.2 + (seed % 1000) / 1000 * 1.3
      setMonthlyListeners(Math.floor(artist.followers_total * multiplier))
    }
  }, [artist, monthlyListeners])

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
          {/* Hero skeleton */}
          <div className="relative h-[40vh] sm:h-[50vh] min-h-[300px] sm:min-h-[340px] max-h-[500px]">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/60 via-purple-800/40 to-black" />
            <div className="relative h-full flex items-end px-4 sm:px-6 md:px-8 pb-4 sm:pb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 w-full">
                <Skeleton className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full" />
                <div className="text-center sm:text-left sm:pb-4 w-full max-w-xl">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-10 sm:h-12 w-64 sm:w-96 mb-3" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
            </div>
          </div>

          {/* Popular tracks skeleton */}
          <div className="px-4 sm:px-6 md:px-8 pb-8">
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-4 p-2 rounded-md">
                  <div className="w-4 text-right">
                    <Skeleton className="h-4 w-4 inline-block" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-2/3 mb-2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <div className="hidden md:block w-24">
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <div className="w-24 flex items-center justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  <div className="w-12 text-right">
                    <Skeleton className="h-3 w-10 ml-auto" />
                  </div>
                </div>
              ))}
            </div>

            {/* Albums skeleton */}
            <div className="mt-10">
              <Skeleton className="h-7 w-28 mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="p-4 rounded-lg">
                    <Skeleton className="aspect-square rounded-lg mb-3" />
                    <Skeleton className="h-4 w-4/5 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Related artists skeleton */}
            <div className="mt-10">
              <Skeleton className="h-7 w-40 mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="p-4 rounded-lg">
                    <Skeleton className="aspect-square rounded-full mb-3" />
                    <Skeleton className="h-4 w-3/5 mb-1 mx-auto" />
                    <Skeleton className="h-3 w-2/5 mx-auto" />
                  </div>
                ))}
              </div>
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
        {/* Hero Section with Spotify-style gradient */}
        <div className="relative h-[40vh] sm:h-[50vh] min-h-[300px] sm:min-h-[340px] max-h-[500px]">
          {/* Dynamic gradient background based on artist image */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/80 via-purple-800/60 to-black"></div>
          
          {/* Background image with overlay */}
          {artist.images && artist.images.length > 0 && (
            <div className="absolute inset-0">
              <Image
                src={artist.images[0].url}
                alt={`${artist.name} background`}
                fill
                className="object-cover opacity-30"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black"></div>
            </div>
          )}
          
          {/* Artist info */}
          <div className="relative h-full flex items-end px-4 sm:px-6 md:px-8 pb-4 sm:pb-6">
            {/* Back button */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:left-8">
              <Button
                variant="ghost"
                className="hidden sm:flex rounded-full h-10 px-4 bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white border border-white/20 items-center gap-2"
                onClick={() => window.history.back()}
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Previous</span>
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 w-full">
              {/* Artist image */}
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 bg-zinc-800 rounded-full overflow-hidden shadow-2xl flex-shrink-0">
                {artist.images && artist.images.length > 0 ? (
                  <Image
                    src={artist.images[0].url}
                    alt={artist.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-6xl sm:text-8xl">👤</div>
                  </div>
                )}
              </div>
              
              {/* Artist details */}
              <div className="text-center sm:text-left sm:pb-4">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <Verified className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 fill-current" />
                  <span className="text-xs sm:text-sm font-medium">Verified Artist</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-4 sm:mb-6 text-white drop-shadow-lg">
                  {artist.name}
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-1 text-sm sm:text-base text-white/90">
                  <span className="font-medium">
                    {monthlyListeners ? `${monthlyListeners.toLocaleString()} monthly listeners` : `${artist.followers_total?.toLocaleString() || '0'} followers`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 bg-gradient-to-b from-black/20 to-black">
          <div className="flex items-center  sm:justify-start gap-4 sm:gap-6 md:gap-8">
            <Button
              size="icon"
              className="rounded-full h-14 w-14 sm:h-16 sm:w-16 bg-green-500 hover:bg-green-400 hover:scale-105 text-black shadow-2xl transition-all duration-200"
              onClick={() => tracks.length && player.play(tracks[0], { queue: tracks, autoplay: true })}
            >
              <Play className="h-6 w-6 sm:h-8 sm:w-8 ml-0.5 sm:ml-1" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-10 w-10 sm:h-12 sm:w-12 hover:bg-white/10 transition-colors"
              onClick={handleShuffle}
            >
              <Shuffle className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-10 w-10 sm:h-12 sm:w-12 hover:bg-white/10 transition-colors"
              onClick={handleFollowToggle}
            >
              {followedArtistIds.includes(artistId || '') ? (
                <Heart className="h-5 w-5 sm:h-6 sm:w-6 fill-green-500 text-green-500" />
              ) : (
                <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-10 w-10 sm:h-12 sm:w-12 hover:bg-white/10 transition-colors"
                >
                  <MoreHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-zinc-800 border-zinc-700 text-white">
                <DropdownMenuItem 
                  className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700"
                  onClick={() => {
                    try {
                      const url = `${window.location.origin}/artist/${artistId}`
                      navigator.clipboard.writeText(url)
                    } catch {}
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  Share Artist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 md:px-8 pb-8">
          {/* Popular Tracks Section */}
          {tracks.length > 0 && (
            <section className="mb-12">
                          <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Popular</h2>
                <Link href={`/artist/${artistId}/tracks`}>
                  <Button 
                    variant="ghost" 
                    className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Show all
                  </Button>
                </Link>
              </div>
              <div className="space-y-1">
                {tracks.slice(0, displayedTracks).map((track, index) => {
                  // console.log('Track Artists:', track)
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
                          artistIds={(track as any).artist_ids}
                          maxLength={25}
                          showLinks={true}
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
              
              {/* Show more/less button */}
              {tracks.length > 5 && (
                <Button
                  variant="ghost"
                  className="mt-4 text-zinc-400 hover:text-white font-medium"
                  onClick={() => setDisplayedTracks(displayedTracks === 5 ? 10 : 5)}
                >
                  {displayedTracks === 5 ? 'Show more' : 'Show less'}
                </Button>
              )}
            </section>
          )}

          {/* Albums Section */}
          {albums.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Albums</h2>
                <Link href={`/artist/${artistId}/albums`}>
                  <Button 
                    variant="ghost" 
                    className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Show all
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {albums.slice(0, 6).map((album) => (
                  <Link
                    key={album.id}
                    href={`/album/${album.id}`}
                    className="group transition-all duration-300 hover:bg-white/5 p-4 rounded-lg"
                  >
                    <div className="relative aspect-square mb-4 rounded-lg overflow-hidden bg-zinc-800 shadow-lg">
                      {album.images && album.images.length > 0 ? (
                        <Image
                          src={album.images[0].url}
                          alt={album.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc3 className="h-16 w-16 text-zinc-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="icon" className="rounded-full h-12 w-12 bg-green-500 hover:bg-green-400 text-black shadow-lg">
                          <Play className="h-6 w-6 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold truncate mb-1">{album.name}</h3>
                    <p className="text-sm text-zinc-400 truncate">
                      {formatAlbumInfo(album.release_date, album.album_type)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Related Artists Section */}
          {relatedArtists.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Related Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {relatedArtists.map((relatedArtist) => (
                  <Link
                    key={relatedArtist.id}
                    href={`/artist/${relatedArtist.id}`}
                    className="group transition-all duration-300 hover:bg-white/5 p-4 rounded-lg"
                  >
                    <div className="relative aspect-square mb-4 rounded-full overflow-hidden bg-zinc-800 shadow-lg">
                      {relatedArtist.images && relatedArtist.images.length > 0 ? (
                        <Image
                          src={relatedArtist.images[0].url}
                          alt={relatedArtist.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-4xl">👤</div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="icon" className="rounded-full h-12 w-12 bg-green-500 hover:bg-green-400 text-black shadow-lg">
                          <Play className="h-6 w-6 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold truncate mb-1 text-center">{relatedArtist.name}</h3>
                    <p className="text-sm text-zinc-400 truncate text-center">
                      {relatedArtist.followers_total?.toLocaleString() || '0'} followers
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
          
          {/* About Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">About</h2>
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-4">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                  {artist.images && artist.images.length > 0 ? (
                    <Image
                      src={artist.images[0].url}
                      alt={artist.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-3xl sm:text-4xl">👤</div>
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-black mb-2">
                    {monthlyListeners ? monthlyListeners.toLocaleString() : (artist.followers_total?.toLocaleString() || '0')}
                  </div>
                  <div className="text-zinc-400 text-sm sm:text-base">
                    {monthlyListeners ? 'monthly listeners' : 'followers'}
                  </div>
                </div>
              </div>
              
              {artist.genres && artist.genres.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Genres</h3>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    {artist.genres.map((genre) => (
                      <span 
                        key={genre} 
                        className="px-2 sm:px-3 py-1 bg-white/10 rounded-full text-xs sm:text-sm capitalize"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>


        </div>
      </main>
      {/* Global MusicPlayer is rendered in app/layout.tsx */}
    </div>
  )
}
