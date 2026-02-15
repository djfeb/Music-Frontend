"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Play, Filter, X, Loader2, ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { usePlayer } from "@/contexts/player-context"
import { musicAPI, Artist, Album, Track } from "@/lib/music-api"

function GospelMusicContent() {
  const { user, contentPreferences } = useAuth()
  const player = usePlayer()
  const searchParams = useSearchParams()
  
  // State
  const [gospelArtists, setGospelArtists] = useState<Artist[]>([])
  const [gospelAlbums, setGospelAlbums] = useState<Album[]>([])
  const [gospelTracks, setGospelTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'artists' | 'albums' | 'tracks'>('artists')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Gospel genres for filtering
  const gospelGenres = [
    { id: 'all', name: 'All Gospel', count: 0 },
    { id: 'african gospel', name: 'African Gospel', count: 0 },
    { id: 'gospel', name: 'Gospel', count: 0 },
    { id: 'christian', name: 'Christian', count: 0 },
    { id: 'worship', name: 'Worship', count: 0 },
    { id: 'praise', name: 'Praise', count: 0 },
    { id: 'hymn', name: 'Hymns', count: 0 },
    { id: 'spiritual', name: 'Spiritual', count: 0 },
    { id: 'contemporary-christian', name: 'Contemporary Christian', count: 0 },
    { id: 'traditional-gospel', name: 'Traditional Gospel', count: 0 }
  ]

  // Load gospel content
  useEffect(() => {
    loadGospelContent(1, true) // Reset to page 1 and clear existing content
  }, [user, contentPreferences, selectedGenre])

  // Handle URL params for genre filtering
  useEffect(() => {
    const genre = searchParams.get('genre')
    if (genre) {
      setSelectedGenre(genre)
    }
  }, [searchParams])

  const loadGospelContent = async (page = 1, reset = false) => {
    if (reset) {
      setIsLoading(true)
      setCurrentPage(1)
      setHasMore(true)
    } else {
      setIsLoadingMore(true)
    }
    
    try {
      console.log('[GOSPEL PAGE] Loading gospel content... Page:', page, 'Genre:', selectedGenre)
      
      // Calculate limit for pagination
      const limit = 25
      
      // Build API URLs based on selected genre
      let artistUrls: string[] = []
      let albumUrls: string[] = []
      let trackUrls: string[] = []
      
      if (selectedGenre === 'all') {
        // Load all gospel content
        artistUrls = [
          `/api/proxy/artists?genre=gospel&limit=${limit}&page=${page}`,
          `/api/proxy/artists?genre=African%20Gospel&limit=${limit}&page=${page}`,
          `/api/proxy/artists?genre=christian&limit=${limit}&page=${page}`
        ]
        albumUrls = [
          `/api/proxy/albums?genre=gospel&limit=${limit}&page=${page}`,
          `/api/proxy/albums?search=gospel&limit=${limit}&page=${page}`
        ]
        trackUrls = [
          `/api/proxy/tracks?genre=gospel&limit=${limit}&page=${page}`,
          `/api/proxy/tracks?search=gospel&limit=${limit}&page=${page}`
        ]
      } else {
       
        // Load content for specific genre
        const encodedGenre = encodeURIComponent(selectedGenre)
         console.log('using genre:', encodedGenre)
        artistUrls = [
          `/api/proxy/artists?genre=${encodedGenre}&limit=${limit}&page=${page}`,
          `/api/proxy/artists?search=${encodedGenre}&limit=${limit}&page=${page}`
        ]
        albumUrls = [
          `/api/proxy/albums?genre=${encodedGenre}&limit=${limit}&page=${page}`,
          `/api/proxy/albums?search=${encodedGenre}&limit=${limit}&page=${page}`
        ]
        trackUrls = [
          `/api/proxy/tracks?genre=${encodedGenre}&limit=${limit}&page=${page}`,
          `/api/proxy/tracks?search=${encodedGenre}&limit=${limit}&page=${page}`
        ]
      }
      
      // Load gospel content with multiple queries
      const [
        gospelArtistsResponse1,
        gospelArtistsResponse2,
        gospelArtistsResponse3,
        gospelAlbumsResponse1,
        gospelAlbumsResponse2,
        gospelTracksResponse1,
        gospelTracksResponse2
      ] = await Promise.all([
        // Gospel artists queries with pagination
        fetch(artistUrls[0] || '').catch(err => {
          console.warn('[GOSPEL PAGE] Fetch error for artists query 1:', err)
          return new Response('{"data":[]}', { status: 200 })
        }),
        fetch(artistUrls[1] || '').catch(err => {
          console.warn('[GOSPEL PAGE] Fetch error for artists query 2:', err)
          return new Response('{"data":[]}', { status: 200 })
        }),
        fetch(artistUrls[2] || '').catch(err => {
          console.warn('[GOSPEL PAGE] Fetch error for artists query 3:', err)
          return new Response('{"data":[]}', { status: 200 })
        }),
        // Gospel albums queries with pagination
        fetch(albumUrls[0] || '').catch(err => {
          console.warn('[GOSPEL PAGE] Fetch error for albums query 1:', err)
          return new Response('{"data":[]}', { status: 200 })
        }),
        fetch(albumUrls[1] || '').catch(err => {
          console.warn('[GOSPEL PAGE] Fetch error for albums query 2:', err)
          return new Response('{"data":[]}', { status: 200 })
        }),
        // Gospel tracks queries with pagination
        fetch(trackUrls[0] || '').catch(err => {
          console.warn('[GOSPEL PAGE] Fetch error for tracks query 1:', err)
          return new Response('{"data":[]}', { status: 200 })
        }),
        fetch(trackUrls[1] || '').catch(err => {
          console.warn('[GOSPEL PAGE] Fetch error for tracks query 2:', err)
          return new Response('{"data":[]}', { status: 200 })
        })
      ])

      const [
        artistsData1,
        artistsData2,
        artistsData3,
        albumsData1,
        albumsData2,
        tracksData1,
        tracksData2
      ] = await Promise.all([
        gospelArtistsResponse1.text().then(text => {
          try {
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
              console.warn('[GOSPEL PAGE] Received HTML instead of JSON for artists query 1')
              return { data: [] }
            }
            return JSON.parse(text)
          } catch (e) {
            console.warn('[GOSPEL PAGE] Failed to parse artists query 1:', e)
            return { data: [] }
          }
        }),
        gospelArtistsResponse2.text().then(text => {
          try {
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
              console.warn('[GOSPEL PAGE] Received HTML instead of JSON for artists query 2')
              return { data: [] }
            }
            return JSON.parse(text)
          } catch (e) {
            console.warn('[GOSPEL PAGE] Failed to parse artists query 2:', e)
            return { data: [] }
          }
        }),
        gospelArtistsResponse3.text().then(text => {
          try {
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
              console.warn('[GOSPEL PAGE] Received HTML instead of JSON for artists query 3')
              return { data: [] }
            }
            return JSON.parse(text)
          } catch (e) {
            console.warn('[GOSPEL PAGE] Failed to parse artists query 3:', e)
            return { data: [] }
          }
        }),
        gospelAlbumsResponse1.text().then(text => {
          try {
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
              console.warn('[GOSPEL PAGE] Received HTML instead of JSON for albums query 1')
              return { data: [] }
            }
            return JSON.parse(text)
          } catch (e) {
            console.warn('[GOSPEL PAGE] Failed to parse albums query 1:', e)
            return { data: [] }
          }
        }),
        gospelAlbumsResponse2.text().then(text => {
          try {
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
              console.warn('[GOSPEL PAGE] Received HTML instead of JSON for albums query 2')
              return { data: [] }
            }
            return JSON.parse(text)
          } catch (e) {
            console.warn('[GOSPEL PAGE] Failed to parse albums query 2:', e)
            return { data: [] }
          }
        }),
        gospelTracksResponse1.text().then(text => {
          try {
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
              console.warn('[GOSPEL PAGE] Received HTML instead of JSON for tracks query 1')
              return { data: [] }
            }
            return JSON.parse(text)
          } catch (e) {
            console.warn('[GOSPEL PAGE] Failed to parse tracks query 1:', e)
            return { data: [] }
          }
        }),
        gospelTracksResponse2.text().then(text => {
          try {
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
              console.warn('[GOSPEL PAGE] Received HTML instead of JSON for tracks query 2')
              return { data: [] }
            }
            return JSON.parse(text)
          } catch (e) {
            console.warn('[GOSPEL PAGE] Failed to parse tracks query 2:', e)
            return { data: [] }
          }
        })
      ])

      // Combine and deduplicate artists
      const allArtists = [
        ...(artistsData1.data || []),
        ...(artistsData2.data || []),
        ...(artistsData3.data || [])
      ]
      const uniqueArtists = Array.from(
          new Map(allArtists.map(artist => [artist.id, artist])).values()
      )

      // Combine and deduplicate albums
      const allAlbums = [
        ...(albumsData1.data || []),
        ...(albumsData2.data || [])
      ]
      const uniqueAlbums = Array.from(
        new Map(allAlbums.map(album => [album.id, album])).values()
      )

      // Combine and deduplicate tracks
      const allTracks = [
        ...(tracksData1.data || []),
        ...(tracksData2.data || [])
      ]
      const uniqueTracks = Array.from(
        new Map(allTracks.map(track => [track.id, track])).values()
      )

      // Filter by gospel terms and selected genre
      const gospelTerms = [
        'african gosple','gospel', 'christian', 'worship', 'praise', 'hymn', 'spiritual',
        'church', 'holy', 'blessed', 'prayer', 'faith', 'jesus', 'christ',
        'god', 'lord', 'hallelujah', 'amen', 'salvation', 'ministry',
        'contemporary christian', 'traditional gospel', 'christian rock', 'christian pop',
        'african gospel', 'southern gospel', 'urban gospel'
      ]

      const filterByGenreAndGospel = (items: any[], type: 'artist' | 'album' | 'track') => {
        return items.filter(item => {
          const itemName = item.name?.toLowerCase() || ''
          const itemGenres = (item.genres || []).map((genre: string) => genre.toLowerCase())
          const artistNames = (item.artists || []).join(' ').toLowerCase()
          
          // First check if it's gospel content
          const hasGospelGenre = itemGenres.some((genre: string) => 
            gospelTerms.some(term => genre.includes(term))
          )
          const hasGospelContent = gospelTerms.some(term => 
            itemName.includes(term) || artistNames.includes(term)
          )
          const isGospel = hasGospelGenre || hasGospelContent
          
          // If not gospel content, filter out
          if (!isGospel) return false
          
          // If 'all' is selected, include all gospel content
          if (selectedGenre === 'all') return true
          
          // Filter by specific genre
          const selectedGenreLower = selectedGenre.toLowerCase()
          const matchesSelectedGenre = 
            itemGenres.some((genre: string) => genre.includes(selectedGenreLower)) ||
            itemName.includes(selectedGenreLower) ||
            artistNames.includes(selectedGenreLower)
          
          return matchesSelectedGenre
        })
      }

      const filteredArtists = filterByGenreAndGospel(uniqueArtists, 'artist')
      const filteredAlbums = filterByGenreAndGospel(uniqueAlbums, 'album')
      const filteredTracks = filterByGenreAndGospel(uniqueTracks, 'track')

      // Apply user preference filtering if available
      let finalArtists = filteredArtists
      let finalAlbums = filteredAlbums
      let finalTracks = filteredTracks

      if (contentPreferences && contentPreferences.preferenceType !== 'mixed') {
        // Apply continent filtering based on user preferences
        // This would need the same continent filtering logic from the homepage
        console.log('[GOSPEL PAGE] Applying user preference filtering:', contentPreferences.preferenceType)
      }

      // Update state based on whether this is a reset or load more
      if (reset) {
        setGospelArtists(finalArtists)
        setGospelAlbums(finalAlbums)
        setGospelTracks(finalTracks)
      } else {
        // Append new content, avoiding duplicates
        setGospelArtists(prev => {
          const existingIds = new Set(prev.map(artist => artist.id))
          const newArtists = finalArtists.filter(artist => !existingIds.has(artist.id))
          return [...prev, ...newArtists]
        })
        
        setGospelAlbums(prev => {
          const existingIds = new Set(prev.map(album => album.id))
          const newAlbums = finalAlbums.filter(album => !existingIds.has(album.id))
          return [...prev, ...newAlbums]
        })
        
        setGospelTracks(prev => {
          const existingIds = new Set(prev.map(track => track.id))
          const newTracks = finalTracks.filter(track => !existingIds.has(track.id))
          return [...prev, ...newTracks]
        })
      }

      // Update pagination state
      setCurrentPage(page)
      
      // Check if there's more content (if we got less than expected, probably no more)
      const totalNewItems = finalArtists.length + finalAlbums.length + finalTracks.length
      setHasMore(totalNewItems >= limit * 0.3) // Lower threshold since filtering reduces results

      console.log('[GOSPEL PAGE] Content loaded:', {
        page,
        reset,
        selectedGenre,
        artists: finalArtists.length,
        albums: finalAlbums.length,
        tracks: finalTracks.length,
        hasMore: totalNewItems >= limit * 0.3,
        sampleArtistGenres: finalArtists.slice(0, 3).map(artist => ({
          name: artist.name,
          genres: artist.genres
        }))
      })

    } catch (error) {
      console.error('[GOSPEL PAGE] Error loading content:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  // Load more content
  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadGospelContent(currentPage + 1, false)
    }
  }

  // Filter content by selected genre (now simplified since filtering happens in loadGospelContent)
  const getFilteredContent = () => {
    return {
      artists: gospelArtists,
      albums: gospelAlbums,
      tracks: gospelTracks
    }
  }

  const filteredContent = getFilteredContent()

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-gradient-to-b from-purple-900 to-black">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex rounded-full h-10 w-10"
                  onClick={() => window.history.back()}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-4xl md:text-6xl font-black">Gospel Music</h1>
                </div>
              </div>
              <p className="hidden sm:block text-lg text-zinc-300 max-w-2xl sm:ml-14">
                Discover inspiring gospel music, worship songs, and Christian artists that uplift your spirit.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {selectedGenre !== 'all' && (
                    <span className="bg-green-500 text-black px-2 py-0.5 rounded-full text-xs">
                      1
                    </span>
                  )}
                </Button>
                
                {selectedGenre !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedGenre('all')}
                    className="flex items-center gap-2 text-zinc-400"
                  >
                    <X className="h-3 w-3" />
                    Clear filters
                  </Button>
                )}
              </div>

              {/* Genre Filter */}
              {showFilters && (
                <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold mb-3">Gospel Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {gospelGenres.map((genre) => (
                      <Button
                        key={genre.id}
                        variant={selectedGenre === genre.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedGenre(genre.id)}
                        className={selectedGenre === genre.id ? "bg-green-500 text-black" : ""}
                      >
                        {genre.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Tabs */}
              <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-1">
                <Button
                  variant={activeTab === 'artists' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab('artists')}
                  className={activeTab === 'artists' ? "bg-white text-black" : ""}
                >
                  Artists ({filteredContent.artists.length})
                </Button>
                {/* I Intentionaly commented this out */}
                {/* <Button
                  variant={activeTab === 'albums' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab('albums')}
                  className={activeTab === 'albums' ? "bg-white text-black" : ""}
                >
                  Albums ({filteredContent.albums.length})
                </Button> 
                <Button
                  variant={activeTab === 'tracks' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab('tracks')}
                  className={activeTab === 'tracks' ? "bg-white text-black" : ""}
                >
                  Tracks ({filteredContent.tracks.length})
                </Button>
                */}
              </div>
            </div>

            {/* Content Display */}
            <div className="min-h-[400px]">
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div key={idx} className="p-4">
                      <Skeleton className={`aspect-square ${activeTab === 'artists' ? 'rounded-full' : 'rounded-lg'} mb-3`} />
                      <Skeleton className="h-4 w-4/5 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Artists Tab */}
                  {activeTab === 'artists' && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredContent.artists.map((artist) => (
                          <Link
                            key={artist.id}
                            href={`/artist/${artist.id}`}
                            className="group p-4 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <div className="relative aspect-square mb-3 rounded-full overflow-hidden bg-zinc-800 shadow-lg">
                              {artist.images && artist.images.length > 0 ? (
                                <Image
                                  src={artist.images[0].url}
                                  alt={artist.name}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                  🎤
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <h3 className="font-medium text-sm mb-1 group-hover:text-white transition-colors line-clamp-2">
                                {artist.name}
                              </h3>
                              <p className="text-xs text-zinc-400">Artist</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      
                      {/* Load More Button for Artists */}
                      {hasMore && filteredContent.artists.length > 0 && (
                        <div className="flex justify-center mt-8">
                          <Button
                            onClick={loadMore}
                            disabled={isLoadingMore}
                            className="bg-green-500 text-black hover:bg-green-400 px-8 py-2"
                          >
                            {isLoadingMore ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading More Artists...
                              </>
                            ) : (
                              'Load More Artists'
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Albums Tab */}
                  {activeTab === 'albums' && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredContent.albums.map((album) => (
                          <Link
                            key={album.id}
                            href={`/album/${album.id}`}
                            className="group p-4 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-zinc-800 shadow-lg">
                              {album.images && album.images.length > 0 ? (
                                <Image
                                  src={album.images[0].url}
                                  alt={album.name}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                  🎵
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  size="icon"
                                  className="rounded-full h-12 w-12 bg-green-500 hover:bg-green-400 text-black shadow-lg"
                                  onClick={async (e) => {
                                    e.preventDefault()
                                    try {
                                      const tracks = await musicAPI.getAlbumTracks(album.id)
                                      if (tracks && tracks.length > 0) {
                                        player.play(tracks[0], { queue: tracks, autoplay: true })
                                      }
                                    } catch (err) {
                                      console.error('Failed to play album', err)
                                    }
                                  }}
                                >
                                  <Play className="h-6 w-6 ml-0.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-center">
                              <h3 className="font-medium text-sm mb-1 group-hover:text-white transition-colors line-clamp-2">
                                {album.name}
                              </h3>
                              <p className="text-xs text-zinc-400 line-clamp-1">
                                {album.artists?.join(', ') || 'Various Artists'}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      
                      {/* Load More Button for Albums */}
                      {hasMore && filteredContent.albums.length > 0 && (
                        <div className="flex justify-center mt-8">
                          <Button
                            onClick={loadMore}
                            disabled={isLoadingMore}
                            className="bg-green-500 text-black hover:bg-green-400 px-8 py-2"
                          >
                            {isLoadingMore ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading More Albums...
                              </>
                            ) : (
                              'Load More Albums'
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Tracks Tab */}
                  {activeTab === 'tracks' && (
                    <>
                      <div className="space-y-2">
                        {filteredContent.tracks.map((track, index) => (
                          <div
                            key={track.id}
                            className="group flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => {
                              player.play(track, { queue: filteredContent.tracks, autoplay: true })
                            }}
                          >
                            <div className="flex-shrink-0 w-8 text-center">
                              <span className="text-zinc-400 text-sm">{index + 1}</span>
                            </div>
                            <div className="flex-shrink-0 w-12 h-12 bg-zinc-800 rounded overflow-hidden">
                              {track.album_images && track.album_images.length > 0 ? (
                                <Image
                                  src={track.album_images[0].url}
                                  alt={track.name}
                                  width={48}
                                  height={48}
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg">
                                  🎵
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate group-hover:text-white transition-colors">
                                {track.name}
                              </h4>
                              <p className="text-xs text-zinc-400 truncate">
                                {track.artists?.join(', ') || 'Unknown Artist'}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Load More Button for Tracks */}
                      {hasMore && filteredContent.tracks.length > 0 && (
                        <div className="flex justify-center mt-8">
                          <Button
                            onClick={loadMore}
                            disabled={isLoadingMore}
                            className="bg-green-500 text-black hover:bg-green-400 px-8 py-2"
                          >
                            {isLoadingMore ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading More Tracks...
                              </>
                            ) : (
                              'Load More Tracks'
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Empty State */}
                  {!isLoading && (
                    (activeTab === 'artists' && filteredContent.artists.length === 0) ||
                    (activeTab === 'albums' && filteredContent.albums.length === 0) ||
                    (activeTab === 'tracks' && filteredContent.tracks.length === 0)
                  ) && (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎵</div>
                      <h3 className="text-xl font-semibold mb-2">No {activeTab} found</h3>
                      <p className="text-zinc-400 mb-4">
                        {selectedGenre !== 'all' 
                          ? `No ${activeTab} found for the selected genre. Try a different filter.`
                          : `No gospel ${activeTab} available at the moment.`
                        }
                      </p>
                      {selectedGenre !== 'all' && (
                        <Button
                          variant="outline"
                          onClick={() => setSelectedGenre('all')}
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <MusicPlayer />
    </div>
  )
}

export default function GospelMusicPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="bg-gradient-to-b from-purple-900 to-black">
            <div className="p-6 md:p-8">
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:flex rounded-full h-10 w-10"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <div>
                    <h1 className="text-2xl sm:text-4xl md:text-6xl font-black">Gospel Music</h1>
                  </div>
                </div>
                <p className="hidden sm:block text-lg text-zinc-300 max-w-2xl sm:ml-14">
                  Discover inspiring gospel music, worship songs, and Christian artists that uplift your spirit.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="p-4">
                    <Skeleton className="aspect-square rounded-full mb-3" />
                    <Skeleton className="h-4 w-4/5 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <MusicPlayer />
      </div>
    }>
      <GospelMusicContent />
    </Suspense>
  )
}