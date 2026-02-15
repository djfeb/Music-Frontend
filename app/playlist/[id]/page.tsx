"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Play, Clock, Heart, MoreHorizontal, Loader2, Music, Search, Plus, X, Download, Share2, ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { firebaseService, Playlist } from "@/lib/firebase-service"
import { musicAPI, Track } from "@/lib/music-api"
import { TruncatedArtists } from "@/components/ui/truncated-artists"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, favoriteTrackIds, addToFavorites, removeFromFavorites } = useAuth()
  const { toast } = useToast()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddSongsModal, setShowAddSongsModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [playlistId, setPlaylistId] = useState<string | null>(null)

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      setPlaylistId(resolvedParams.id)
    }
    loadParams()
  }, [params])

  useEffect(() => {
    if (!playlistId) return

    const loadPlaylistData = async () => {
      try {
        setIsLoading(true)
        const playlistData = await firebaseService.getPlaylist(playlistId)
        
        if (!playlistData) {
          setError('Playlist not found')
          return
        }

        setPlaylist(playlistData)

        // Load track details for each track ID
        if (playlistData.tracks.length > 0) {
          const trackPromises = playlistData.tracks.map(trackId => 
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
            setTracks(tracksWithImages)
          } catch (error) {
            // If fetching album images fails, use tracks without images
            console.warn('Failed to fetch album images for playlist tracks:', error)
            setTracks(validTracks)
          }
        }
      } catch (err) {
        console.error('Error loading playlist:', err)
        setError('Failed to load playlist data')
      } finally {
        setIsLoading(false)
      }
    }

    loadPlaylistData()
  }, [playlistId])

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Use the actual search endpoint - it returns paginated results
      const searchResponse = await musicAPI.searchTracks(query)
      
      // The API returns a paginated response with data array
      let tracks = searchResponse.data || []
      
      // Fetch album images for tracks to display them
      try {
        const tracksWithImages = await Promise.all(
          tracks.slice(0, 20).map(async (track) => {
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
        setSearchResults(tracksWithImages)
      } catch (error) {
        // If fetching album images fails, use tracks without images
        setSearchResults(tracks.slice(0, 20))
      }
    } catch (error) {
      console.error('Error searching tracks:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search to avoid too many API calls
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (query: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          handleSearch(query)
        }, 300) // Wait 300ms after user stops typing
      }
    })(),
    []
  )

  const handleAddSongToPlaylist = async (trackId: string) => {
    if (!playlist) return

    try {
      await firebaseService.addTrackToPlaylist(playlist.id, trackId)
      
      // Refresh playlist data
      const updatedPlaylist = await firebaseService.getPlaylist(playlist.id)
      if (updatedPlaylist) {
        setPlaylist(updatedPlaylist)
        
        // Add the new track to the tracks array with album images
        const newTrack = await musicAPI.getTrack(trackId)
        if (newTrack) {
          try {
            // Fetch album images for the new track
            const album = await musicAPI.getAlbum(newTrack.album_id)
            const trackWithImages = {
              ...newTrack,
              album_images: album.images || []
            }
            setTracks(prev => [...prev, trackWithImages])
          } catch (error) {
            // If album fetch fails, add track without images
            console.warn('Failed to fetch album images for new track:', error)
            setTracks(prev => [...prev, newTrack])
          }
        }
      }

      toast({
        title: "Song added!",
        description: "The song has been added to your playlist.",
      })
    } catch (error) {
      console.error('Error adding song to playlist:', error)
      toast({
        title: "Error",
        description: "Failed to add song to playlist.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveSongFromPlaylist = async (trackId: string) => {
    if (!playlist) return

    try {
      await firebaseService.removeTrackFromPlaylist(playlist.id, trackId)
      
      // Refresh playlist data
      const updatedPlaylist = await firebaseService.getPlaylist(playlist.id)
      if (updatedPlaylist) {
        setPlaylist(updatedPlaylist)
        
        // Remove track and refresh tracks with images
        if (updatedPlaylist.tracks.length > 0) {
          const trackPromises = updatedPlaylist.tracks.map(trackId => 
            musicAPI.getTrack(trackId).catch(() => null)
          )
          const trackResults = await Promise.all(trackPromises)
          const validTracks = trackResults.filter(track => track !== null) as Track[]
          
          // Fetch album images for remaining tracks
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
                  return track
                }
              })
            )
            setTracks(tracksWithImages)
          } catch (error) {
            setTracks(validTracks)
          }
        } else {
          setTracks([])
        }
      }

      toast({
        title: "Song removed!",
        description: "The song has been removed from your playlist.",
      })
    } catch (error) {
      console.error('Error removing song from playlist:', error)
      toast({
        title: "Error",
        description: "Failed to remove song from playlist.",
        variant: "destructive",
      })
    }
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
    // Copy track info to clipboard
    const trackInfo = `${track.name} by ${track.artists?.join(', ') || 'Unknown Artist'}`
    navigator.clipboard.writeText(trackInfo).then(() => {
      console.log('Track info copied to clipboard:', trackInfo)
    }).catch(() => {
      console.log('Failed to copy track info')
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        </main>
      </div>
    )
  }

  if (error || !playlist) {
    return (
      <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Playlist Not Found</h1>
              <p className="text-zinc-400">{error || 'The playlist you are looking for does not exist.'}</p>
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
        
        <div className="bg-gradient-to-b from-zinc-800 to-black">
          {/* Playlist Header */}
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="relative w-58 h-58 bg-zinc-800 rounded-lg overflow-hidden shadow-xl">
              {playlist.coverImage ? (
                <Image
                  src={playlist.coverImage}
                  alt={playlist.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-6xl">🎵</div>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs uppercase font-medium">Playlist</p>
              <h1 className="text-3xl md:text-5xl font-bold mt-2 mb-4">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-zinc-400 mb-2 max-w-md">{playlist.description}</p>
              )}
              <div className="flex items-center gap-1 text-sm text-zinc-400">
                <span>{tracks.length} songs</span>
                {playlist.isPublic && <span>• Public</span>}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 md:px-8 pb-6">
            <div className="flex items-center gap-6">
              <Button
                size="icon"
                className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600 text-black shadow-lg"
              >
                <Play className="h-7 w-7" />
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => setShowAddSongsModal(true)}
              >
                <Plus className="h-4 w-4" />
                Add Songs
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Heart className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tracks Section */}
        <div className="p-6 md:p-8">
          {tracks.length > 0 ? (
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <table className="w-full">
                <thead>
                  <tr className="text-zinc-400 text-left border-b border-zinc-800 text-sm">
                    <th className="pb-3 pl-4 w-12">#</th>
                    <th className="pb-3">Title</th>
                    <th className="pb-3 hidden md:table-cell">Track #</th>
                    <th className="pb-3 text-right pr-4">
                      <Clock className="h-4 w-4 inline" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track, index) => {
                    const isLiked = favoriteTrackIds.includes(track.id)

                    return (
                      <tr key={track.id} className="group hover:bg-zinc-800/50 text-sm">
                        <td className="py-3 pl-4">{index + 1}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-700 rounded flex items-center justify-center overflow-hidden">
                              {track.album_images && track.album_images.length > 0 ? (
                                <Image
                                  src={track.album_images[0].url}
                                  alt={track.name}
                                  width={40}
                                  height={40}
                                  className="object-cover w-full h-full"
                                  style={{ width: 'auto', height: 'auto' }}
                                />
                              ) : (
                                <Music className="h-5 w-5 text-zinc-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{track.name}</div>
                              <div className="text-zinc-400 text-xs">
                                {track.artists && track.artists.length > 0 
                                  ? track.artists.join(', ')
                                  : `Track #${track.track_number}`
                                }
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 hidden md:table-cell text-zinc-400">
                          {track.track_number}
                        </td>
                        <td className="py-3 text-right pr-4 text-zinc-400">
                          <div className="flex items-center justify-end gap-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${isLiked ? "text-red-500" : "text-zinc-400"} opacity-0 group-hover:opacity-100`}
                              onClick={() => {
                                if (isLiked) {
                                  removeFromFavorites(track.id)
                                } else {
                                  addToFavorites(track.id)
                                }
                              }}
                            >
                              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                            </Button>
                            <span>{formatDuration(track.duration_ms)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300"
                              onClick={() => handleRemoveSongFromPlaylist(track.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400">
              <Music className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
              <p className="text-lg">No tracks in this playlist</p>
              <p className="text-sm">Add some tracks to get started</p>
            </div>
          )}
        </div>
      </main>
      <MusicPlayer />

      {/* Add Songs Modal */}
      {showAddSongsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Add Songs to Playlist</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddSongsModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Search Input */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search for songs..."
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value
                      setSearchQuery(value)
                      if (value.trim()) {
                        debouncedSearch(value)
                      } else {
                        setSearchResults([])
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Search Results */}
              <div className="max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    <span className="ml-2 text-zinc-400">Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((track) => {
                      const isAlreadyInPlaylist = tracks.some(t => t.id === track.id)
                      
                      return (
                        <div
                          key={track.id}
                          className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-700 rounded flex items-center justify-center overflow-hidden">
                              {track.album_images && track.album_images.length > 0 ? (
                                <Image
                                  src={track.album_images[0].url}
                                  alt={track.name}
                                  width={40}
                                  height={40}
                                  className="object-cover w-full h-full"
                                  style={{ width: 'auto', height: 'auto' }}
                                />
                              ) : (
                                <Music className="h-5 w-5 text-zinc-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{track.name}</div>
                              <div className="text-zinc-400 text-xs">
                                {track.artists && track.artists.length > 0 
                                  ? track.artists.join(', ')
                                  : `Track #${track.track_number}`
                                }
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-zinc-400">
                              {formatDuration(track.duration_ms)}
                            </span>
                            {isAlreadyInPlaylist ? (
                              <span className="text-sm text-zinc-500 px-2 py-1 bg-zinc-700 rounded">
                                Already added
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleAddSongToPlaylist(track.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="text-center py-8 text-zinc-400">
                    <Search className="h-12 w-12 mx-auto mb-2 text-zinc-600" />
                    <p>No songs found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-400">
                    <Search className="h-12 w-12 mx-auto mb-2 text-zinc-600" />
                    <p>Search for songs to add</p>
                    <p className="text-sm">Type in the search box above</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
