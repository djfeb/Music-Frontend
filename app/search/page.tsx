"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Music, Disc3, Users, Loader2, Play, ChevronLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { usePlayer } from "@/contexts/player-context"
import { musicAPI, Artist, Album, Track } from "@/lib/music-api"
import { TruncatedArtists } from "@/components/ui/truncated-artists"

export default function SearchPage() {
  const player = usePlayer()
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{
    artists: Artist[]
    albums: Album[]
    tracks: Track[]
  }>({ artists: [], albums: [], tracks: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("tracks")
  const [hasSearched, setHasSearched] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showRecentSearches, setShowRecentSearches] = useState(false)

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults({ artists: [], albums: [], tracks: [] })
      setHasSearched(false)
      return
    }

    // Add to recent searches
    const trimmedQuery = searchQuery.trim()
    const updatedSearches = [trimmedQuery, ...recentSearches.filter(s => s !== trimmedQuery)].slice(0, 20)
    setRecentSearches(updatedSearches)
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches))

    setIsLoading(true)
    setHasSearched(true)
    try {
      console.log('Starting search for:', searchQuery)
      
      // Test each endpoint individually
      let artists: Artist[] = []
      let albums: Album[] = []
      let tracksResponse: { data: Track[] } = { data: [] }

      try {
        console.log('Searching artists...')
        const artistResult = await musicAPI.searchArtists(searchQuery)
        console.log('Artist search success:', artistResult)
        // Handle both array and paginated response formats
        artists = Array.isArray(artistResult) ? artistResult : ((artistResult as any)?.data || [])
      } catch (err) {
        console.error('Artist search failed:', err)
      }

      try {
        console.log('Searching albums...')
        const albumResult = await musicAPI.searchAlbums(searchQuery)
        console.log('Album search success:', albumResult)
        // Handle both array and paginated response formats
        albums = Array.isArray(albumResult) ? albumResult : ((albumResult as any)?.data || [])
      } catch (err) {
        console.error('Album search failed:', err)
      }

      try {
        console.log('Searching tracks...')
        tracksResponse = await musicAPI.searchTracks(searchQuery)
        console.log('Track search success:', tracksResponse)
      } catch (err) {
        console.error('Track search failed:', err)
      }

      console.log('Final search results:', { 
        artists: artists.length, 
        albums: albums.length, 
        tracks: tracksResponse.data?.length || 0 
      })

      // Handle paginated tracks response and fetch album images
      let tracks = tracksResponse.data || []
      
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
        tracks = tracksWithImages
      } catch (error) {
        // If fetching album images fails, use tracks without images
        console.warn('Failed to fetch album images:', error)
      }

      setSearchResults({ artists, albums, tracks })
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults({ artists: [], albums: [], tracks: [] })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.warn('Failed to parse recent searches:', error)
      }
    }
  }, [])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(query)
    }, 300) // 300ms delay

    return () => clearTimeout(timeoutId)
  }, [query, handleSearch])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(query)
      setShowRecentSearches(false)
    }
  }

  const handleInputFocus = () => {
    console.log('Input focused, recent searches:', recentSearches.length, recentSearches)
    if (recentSearches.length > 0 && !query.trim()) {
      setShowRecentSearches(true)
    }
  }

  const handleInputBlur = () => {
    // Delay hiding to allow clicking on recent searches
    setTimeout(() => setShowRecentSearches(false), 200)
  }

  const handleRecentSearchClick = (searchTerm: string) => {
    setQuery(searchTerm)
    handleSearch(searchTerm)
    setShowRecentSearches(false)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
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
        <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-4 mb-4 sm:mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex rounded-full h-10 w-10"
                  onClick={() => window.history.back()}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  Search for Music
                </h1>
              </div>
              <p className="text-sm sm:text-base text-zinc-400 mb-6 sm:mb-8">
                Discover new artists, albums, and tracks
              </p>
              
              {/* Search Input */}
              <div className="relative max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4 sm:h-5 sm:w-5" />
                  <Input
                    type="text"
                    placeholder="Search for artists, albums, or tracks..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="pl-10 pr-4 py-3 sm:py-4 text-base sm:text-lg bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                {/* Recent Searches Dropdown */}
                {showRecentSearches && recentSearches.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10">
                    <div className="p-3 border-b border-zinc-700 flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Recent searches</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearRecentSearches}
                        className="text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        Clear all
                      </Button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {recentSearches.map((searchTerm, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecentSearchClick(searchTerm)}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-sm text-zinc-300 hover:text-white transition-colors"
                        >
                          {searchTerm}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Search Results */}
            {hasSearched && (
              <div className="space-y-6 sm:space-y-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-zinc-800/50 border border-zinc-700">
                    <TabsTrigger 
                      value="tracks" 
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      <Music className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Tracks</span>
                      <span className="sm:hidden">Tracks</span>
                      {searchResults.tracks.length > 0 && (
                        <span className="ml-2 bg-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-full">
                          {searchResults.tracks.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="albums" 
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      <Disc3 className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Albums</span>
                      <span className="sm:hidden">Albums</span>
                      {searchResults.albums.length > 0 && (
                        <span className="ml-2 bg-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-full">
                          {searchResults.albums.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="artists" 
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Artists</span>
                      <span className="sm:hidden">Artists</span>
                      {searchResults.artists.length > 0 && (
                        <span className="ml-2 bg-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-full">
                          {searchResults.artists.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  {/* Tracks Tab */}
                  <TabsContent value="tracks" className="mt-6">
                    {isLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <div key={idx} className="bg-zinc-800/50 rounded-lg p-3 sm:p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-700 rounded animate-pulse"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-zinc-700 rounded animate-pulse"></div>
                                <div className="h-3 bg-zinc-700 rounded w-2/3 animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchResults.tracks.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {searchResults.tracks.map((track) => (
                          <div
                            key={track.id}
                            className="bg-zinc-800/50 hover:bg-zinc-800/70 rounded-lg p-3 sm:p-4 transition-colors cursor-pointer group"
                            onClick={() => player.play(track, { queue: searchResults.tracks, autoplay: true })}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-12 sm:w-16 sm:h-16 bg-zinc-700 rounded overflow-hidden flex-shrink-0">
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
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Button size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 bg-green-500 hover:bg-green-400 text-black">
                                    <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm sm:text-base text-white truncate mb-1">
                                  {track.name}
                                </h3>
                                <TruncatedArtists 
                                  artists={track.artists}
                                  artistIds={track.artist_ids}
                                  maxLength={20}
                                  className="text-xs sm:text-sm text-zinc-400 truncate"
                                  showLinks={true}
                                  onClick={(e) => { e.stopPropagation() }}
                                />
                                <p className="text-xs text-zinc-500 mt-1">
                                  {formatDuration(track.duration_ms)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Music className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-400 text-lg">No tracks found</p>
                        <p className="text-zinc-500 text-sm">Try searching for something else</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Albums Tab */}
                  <TabsContent value="albums" className="mt-6">
                    {isLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <div key={idx} className="text-center">
                            <div className="w-full aspect-square bg-zinc-700 rounded-lg animate-pulse mb-3"></div>
                            <div className="h-4 bg-zinc-700 rounded animate-pulse mb-2"></div>
                            <div className="h-3 bg-zinc-700 rounded w-2/3 mx-auto animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    ) : searchResults.albums.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                        {searchResults.albums.map((album) => (
                          <Link
                            key={album.id}
                            href={`/album/${album.id}`}
                            className="group text-center"
                          >
                            <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-zinc-800">
                              {album.images && album.images.length > 0 ? (
                                <Image
                                  src={album.images[0].url}
                                  alt={album.name}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">
                                  🎵
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button size="icon" className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-green-500 hover:bg-green-400 text-black">
                                  <Play className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" />
                                </Button>
                              </div>
                            </div>
                            <h3 className="font-medium text-sm sm:text-base text-white truncate mb-1">
                              {album.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-zinc-400 truncate">
                              {album.release_date ? new Date(album.release_date).getFullYear() : 'Unknown'}
                            </p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Disc3 className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-400 text-lg">No albums found</p>
                        <p className="text-zinc-500 text-sm">Try searching for something else</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Artists Tab */}
                  <TabsContent value="artists" className="mt-6">
                    {isLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <div key={idx} className="text-center">
                            <div className="w-full aspect-square bg-zinc-700 rounded-full animate-pulse mb-3"></div>
                            <div className="h-4 bg-zinc-700 rounded animate-pulse mb-2"></div>
                            <div className="h-3 bg-zinc-700 rounded w-2/3 mx-auto animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    ) : searchResults.artists.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                        {searchResults.artists.map((artist) => (
                          <Link
                            key={artist.id}
                            href={`/artist/${artist.id}`}
                            className="group text-center"
                          >
                            <div className="relative aspect-square mb-3 rounded-full overflow-hidden bg-zinc-800">
                              {artist.images && artist.images.length > 0 ? (
                                <Image
                                  src={artist.images[0].url}
                                  alt={artist.name}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">
                                  👤
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button size="icon" className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-green-500 hover:bg-green-400 text-black">
                                  <Play className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" />
                                </Button>
                              </div>
                            </div>
                            <h3 className="font-medium text-sm sm:text-base text-white truncate mb-1">
                              {artist.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-zinc-400 truncate">Artist</p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-400 text-lg">No artists found</p>
                        <p className="text-zinc-500 text-sm">Try searching for something else</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Initial State */}
            {!hasSearched && (
              <div className="text-center py-12 sm:py-16">
                <Search className="h-16 w-16 sm:h-20 sm:w-20 text-zinc-600 mx-auto mb-6" />
                <h2 className="text-xl sm:text-2xl font-semibold text-zinc-300 mb-3">
                  Start Searching
                </h2>
                <p className="text-zinc-500 text-sm sm:text-base max-w-md mx-auto">
                  Use the search bar above to find your favorite music, discover new artists, or explore albums
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

