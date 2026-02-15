"use client"

import { useState, useEffect } from "react"
import { Library, Play, Plus, Disc3, Users, Music, Heart, MoreHorizontal, Clock, Trash2, Share2, Download, ListMusic, ChevronLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { usePlayer } from "@/contexts/player-context"
import { useAuth } from "@/contexts/auth-context"
import { firebaseService, Playlist } from "@/lib/firebase-service"
import { musicAPI, Album, Artist, Track } from "@/lib/music-api"
import { formatDate, formatRelativeDate } from "@/lib/date-utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function LibraryPage() {
  const player = usePlayer()
  const { user, favoriteTrackIds, addToFavorites, removeFromFavorites, followedArtistIds, unfollowArtist, likedAlbumIds, unlikeAlbum } = useAuth()
  const [activeTab, setActiveTab] = useState("playlists")
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([])
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([])
  const [likedAlbums, setLikedAlbums] = useState<Album[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null)
  const [playlistTracks, setPlaylistTracks] = useState<{ [key: string]: Track[] }>({})
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)

  useEffect(() => {
    if (user) {
      loadUserContent()
    }
  }, [user, followedArtistIds, likedAlbumIds])

  const loadUserContent = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const playlists = await firebaseService.getUserPlaylists(user.uid)
      setUserPlaylists(playlists)
      
      // Load followed artists
      if (followedArtistIds.length > 0) {
        const artistPromises = followedArtistIds.map(artistId => 
          musicAPI.getArtist(artistId).catch(() => null)
        )
        const artistResults = await Promise.all(artistPromises)
        const validArtists = artistResults.filter(artist => artist !== null) as Artist[]
        setFollowedArtists(validArtists)
      } else {
        setFollowedArtists([])
      }
      
      // Load liked albums
      if (likedAlbumIds.length > 0) {
        const albumPromises = likedAlbumIds.map(albumId => 
          musicAPI.getAlbum(albumId).catch(() => null)
        )
        const albumResults = await Promise.all(albumPromises)
        const validAlbums = albumResults.filter(album => album !== null) as Album[]
        setLikedAlbums(validAlbums)
      } else {
        setLikedAlbums([])
      }
    } catch (error) {
      console.error("Error loading user content:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPlaylistDate = (date: Date) => {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
    return `${Math.ceil(diffDays / 365)} years ago`
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const loadPlaylistTracks = async (playlistId: string) => {
    if (playlistTracks[playlistId]) return // Already loaded

    try {
      const playlist = await firebaseService.getPlaylist(playlistId)
      if (!playlist || playlist.tracks.length === 0) {
        setPlaylistTracks(prev => ({ ...prev, [playlistId]: [] }))
        return
      }

      // Fetch track details for each track ID
      const trackPromises = playlist.tracks.map(trackId => 
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
        setPlaylistTracks(prev => ({ ...prev, [playlistId]: tracksWithImages }))
      } catch (error) {
        // If fetching album images fails, use tracks without images
        console.warn('Failed to fetch album images for playlist tracks:', error)
        setPlaylistTracks(prev => ({ ...prev, [playlistId]: validTracks }))
      }
    } catch (error) {
      console.error('Error loading playlist tracks:', error)
      setPlaylistTracks(prev => ({ ...prev, [playlistId]: [] }))
    }
  }

  const togglePlaylistExpansion = async (playlistId: string) => {
    if (expandedPlaylist === playlistId) {
      setExpandedPlaylist(null)
    } else {
      setExpandedPlaylist(playlistId)
      await loadPlaylistTracks(playlistId)
    }
  }

  const handleRemoveTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    try {
      await firebaseService.removeTrackFromPlaylist(playlistId, trackId)
      // Refresh the tracks
      await loadPlaylistTracks(playlistId)
      // Update playlist count
      const updatedPlaylists = await firebaseService.getUserPlaylists(user!.uid)
      setUserPlaylists(updatedPlaylists)
    } catch (error) {
      console.error('Error removing track from playlist:', error)
    }
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

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 text-center">
            <Library className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
            <h1 className="text-2xl font-bold mb-2">Your Library</h1>
            <p className="text-zinc-400 mb-4">Sign in to view your saved music</p>
            <Link href="/sign-in">
              <Button>Sign In</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex rounded-full h-10 w-10"
                onClick={() => window.history.back()}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-3xl font-bold">Your Library</h1>
            </div>
            <Link href="/create-playlist">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Playlist
              </Button>
            </Link>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border-zinc-800">
              <TabsTrigger value="playlists" className="data-[state=active]:bg-zinc-800">
                <Music className="h-4 w-4 mr-2" />
                Playlists ({userPlaylists.length})
              </TabsTrigger>
              <TabsTrigger value="albums" className="data-[state=active]:bg-zinc-800">
                <Disc3 className="h-4 w-4 mr-2" />
                Albums ({likedAlbums.length})
              </TabsTrigger>
              <TabsTrigger value="artists" className="data-[state=active]:bg-zinc-800">
                <Users className="h-4 w-4 mr-2" />
                Artists ({followedArtists.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="playlists" className="mt-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                </div>
              ) : userPlaylists.length > 0 ? (
                <div className="space-y-4">
                  {userPlaylists.map((playlist) => (
                    <div key={playlist.id} className="bg-zinc-800/30 rounded-lg overflow-hidden">
                      {/* Playlist Header */}
                      <div className="flex items-center gap-4 p-4 hover:bg-zinc-800/60 transition-colors">
                                                 <div className="w-16 h-16 bg-zinc-700 rounded flex items-center justify-center overflow-hidden">
                           {playlist.coverImage ? (
                             <Image
                               src={playlist.coverImage}
                               alt={playlist.name}
                               width={64}
                               height={64}
                               className="object-cover w-full h-full"
                               style={{ width: 'auto', height: 'auto' }}
                             />
                           ) : (
                             <Music className="h-8 w-8 text-zinc-400" />
                           )}
                         </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{playlist.name}</h3>
                          <p className="text-sm text-zinc-400 truncate">
                            {playlist.tracks?.length || 0} tracks
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {formatRelativeDate(playlist.updatedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePlaylistExpansion(playlist.id)}
                            className="text-zinc-400 hover:text-white"
                          >
                            {expandedPlaylist === playlist.id ? 'Hide Tracks' : 'Show Tracks'}
                          </Button>
                          <Link href={`/playlist/${playlist.id}`}>
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                              <Play className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Expanded Tracks */}
                      {expandedPlaylist === playlist.id && (
                        <div className="border-t border-zinc-700 bg-zinc-900/50">
                          {playlistTracks[playlist.id] ? (
                            playlistTracks[playlist.id].length > 0 ? (
                              <div className="p-4">
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
                                    {playlistTracks[playlist.id].map((track, index) => {
                                      const isLiked = favoriteTrackIds.includes(track.id)
                                      return (
                                        <tr key={track.id} className="group hover:bg-zinc-800/50 text-sm">
                                          <td className="py-3 pl-4">{index + 1}</td>
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
                                                    style={{ width: 'auto', height: 'auto' }}
                                                  />
                                                ) : (
                                                  <Music className="h-5 w-5 text-zinc-400" />
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                                                  <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-6 w-6 rounded-full"
                                                    onClick={() => player.play(track, { queue: playlistTracks[playlist.id], autoplay: true })}
                                                  >
                                                    <Play className="h-3 w-3 text-black" />
                                                  </Button>
                                                </div>
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
                                            Track #{track.track_number}
                                          </td>
                                          <td className="py-3 text-right pr-4 text-zinc-400">
                                            <div className="flex items-center justify-end gap-3">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white"
                                                onClick={() => player.play(track, { queue: playlistTracks[playlist.id], autoplay: true })}
                                              >
                                                <Play className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-8 w-8 ${isLiked ? "text-red-500" : "text-zinc-400"} opacity-0 group-hover:opacity-100 hover:text-red-400`}
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
                                                  <DropdownMenuSeparator className="bg-zinc-700" />
                                                  <DropdownMenuItem 
                                                    className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700 text-red-400 hover:text-red-300"
                                                    onClick={() => handleRemoveTrackFromPlaylist(playlist.id, track.id)}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                    Remove from Playlist
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
                              <div className="p-8 text-center text-zinc-400">
                                <Music className="h-12 w-12 mx-auto mb-2 text-zinc-600" />
                                <p>No tracks in this playlist</p>
                              </div>
                            )
                          ) : (
                            <div className="p-8 text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                              <p className="text-zinc-400">Loading tracks...</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400">
                  <Music className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
                  <p className="text-lg">No playlists yet</p>
                  <p className="text-sm">Create your first playlist to get started</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="albums" className="mt-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                </div>
              ) : likedAlbums.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {likedAlbums.map((album) => (
                    <div key={album.id} className="group bg-zinc-800/30 p-4 rounded-lg hover:bg-zinc-800/60 transition-all duration-200">
                      <div className="relative mb-4">
                        <div className="aspect-square rounded-lg overflow-hidden bg-zinc-700">
                          {album.images && album.images.length > 0 ? (
                            <Image
                              src={album.images[0].url}
                              alt={album.name}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Disc3 className="h-12 w-12 text-zinc-400" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/album/${album.id}`}>
                            <Button
                              size="icon"
                              className="rounded-full h-12 w-12 bg-green-500 hover:bg-green-400 text-black shadow-lg"
                            >
                              <Play className="h-5 w-5 ml-0.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <div className="text-center">
                        <Link href={`/album/${album.id}`}>
                          <h3 className="font-semibold text-white hover:underline truncate mb-1">
                            {album.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-zinc-400 mb-3">
                          {formatDate(album.release_date, 'year')}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                            onClick={() => unlikeAlbum(album.id)}
                          >
                            Liked
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-white"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48 bg-zinc-800 border-zinc-700 text-white">
                              <DropdownMenuItem asChild>
                                <Link href={`/album/${album.id}`} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700">
                                  <Play className="h-4 w-4" />
                                  Go to Album
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-zinc-700" />
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700 text-red-400 hover:text-red-300"
                                onClick={() => unlikeAlbum(album.id)}
                              >
                                <Heart className="h-4 w-4" />
                                Remove from Library
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400">
                  <Disc3 className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
                  <p className="text-lg">No albums saved</p>
                  <p className="text-sm">Save albums to your library to see them here</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="artists" className="mt-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                </div>
              ) : followedArtists.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {followedArtists.map((artist) => (
                    <div key={artist.id} className="group bg-zinc-800/30 p-4 rounded-lg hover:bg-zinc-800/60 transition-all duration-200">
                      <div className="relative mb-4">
                        <div className="aspect-square rounded-full overflow-hidden bg-zinc-700">
                          {artist.images && artist.images.length > 0 ? (
                            <Image
                              src={artist.images[0].url}
                              alt={artist.name}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="h-12 w-12 text-zinc-400" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/artist/${artist.id}`}>
                            <Button
                              size="icon"
                              className="rounded-full h-12 w-12 bg-green-500 hover:bg-green-400 text-black shadow-lg"
                            >
                              <Play className="h-5 w-5 ml-0.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <div className="text-center">
                        <Link href={`/artist/${artist.id}`}>
                          <h3 className="font-semibold text-white hover:underline truncate mb-1">
                            {artist.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-zinc-400 mb-3">Artist</p>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                            onClick={() => unfollowArtist(artist.id)}
                          >
                            Following
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-white"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48 bg-zinc-800 border-zinc-700 text-white">
                              <DropdownMenuItem asChild>
                                <Link href={`/artist/${artist.id}`} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700">
                                  <Play className="h-4 w-4" />
                                  Go to Artist
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-zinc-700" />
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700 text-red-400 hover:text-red-300"
                                onClick={() => unfollowArtist(artist.id)}
                              >
                                <Heart className="h-4 w-4" />
                                Unfollow
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400">
                  <Users className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
                  <p className="text-lg">No artists followed</p>
                  <p className="text-sm">Follow artists to see them in your library</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      {/* Global MusicPlayer is rendered in app/layout.tsx */}
    </div>
  )
}

