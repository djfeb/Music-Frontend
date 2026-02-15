"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Play, Loader2, ChevronLeft, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePlayer } from "@/contexts/player-context"
import { Sidebar } from "@/components/sidebar"
import { Artist } from "@/lib/music-api"

export default function ArtistsPage() {
  const player = usePlayer()
  const [artists, setArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const lastFocusReloadAt = useRef(0)

  const genres = [
    { value: 'all', label: 'All Genres' },
    { value: 'gospel', label: 'Gospel' },
    { value: 'african gospel', label: 'African Gospel' },
    { value: 'afrobeat', label: 'Afrobeat' },
    { value: 'highlife', label: 'Highlife' },
    { value: 'afropop', label: 'Afropop' },
    { value: 'asakaa', label: 'Asakaa' },
  ]

  useEffect(() => {
    loadArtists()
  }, [selectedGenre])

  const loadArtists = async (pageNum = 1) => {
    try {
      setIsLoading(true)
      let url = `/api/proxy/artists?sort=popularity&order=desc&limit=100&page=${pageNum}`
      
      // Add genre filter if not 'all'
      if (selectedGenre !== 'all') {
        url += `&genre=${encodeURIComponent(selectedGenre)}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      // Helper function to deduplicate artists by ID
      const deduplicateArtists = (artists: Artist[]) => {
        const seen = new Set()
        return artists.filter((artist: Artist) => {
          if (seen.has(artist.id)) {
            return false
          }
          seen.add(artist.id)
          return true
        })
      }
      
      if (pageNum === 1) {
        // Deduplicate initial data as well
        setArtists(deduplicateArtists(data.data || []))
      } else {
        setArtists(prev => {
          // Deduplicate artists by ID to prevent duplicate key errors
          const existingIds = new Set(prev.map((artist: Artist) => artist.id))
          const newArtists = (data.data || []).filter((artist: Artist) => !existingIds.has(artist.id))
          return [...prev, ...newArtists]
        })
      }
      
      setHasMore(data.pagination?.page < data.pagination?.pages)
      setPage(pageNum)
      if ((data.data || []).length === 0 && pageNum === 1) scheduleRetry()
    } catch (error) {
      console.error("Error loading artists:", error)
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
      loadArtists(1)
    }, delay)
  }

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadArtists(page + 1)
    }
  }

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre)
    setPage(1)
    setHasMore(true)
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
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="hidden sm:flex rounded-full h-10 w-10">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl md:text-4xl font-black mb-2">Popular Artists</h1>
                <p className="text-zinc-400">
                  {selectedGenre === 'all' 
                    ? 'Discover the most popular artists' 
                    : `Filtered by ${genres.find(g => g.value === selectedGenre)?.label}`
                  }
                </p>
              </div>
            </div>
            
            {/* Genre Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-zinc-600 text-zinc-300 hover:bg-zinc-800">
                  <Filter className="h-4 w-4" />
                  {genres.find(g => g.value === selectedGenre)?.label || 'All Genres'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-zinc-800 border-zinc-700 text-white">
                {genres.map((genre) => (
                  <DropdownMenuItem
                    key={genre.value}
                    className={`cursor-pointer hover:bg-zinc-700 ${
                      selectedGenre === genre.value ? 'bg-zinc-700 text-green-400' : ''
                    }`}
                    onClick={() => handleGenreChange(genre.value)}
                  >
                    {genre.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Artists Grid */}
          {artists.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="p-4 rounded-lg">
                  <div className="mb-4"><Skeleton className="aspect-square rounded-full" /></div>
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {artists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artist/${artist.id}`}
                    className="group p-4 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="relative aspect-square mb-4 rounded-full overflow-hidden bg-zinc-800">
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
                        <Button size="icon" className="rounded-full h-12 w-12 bg-green-500 hover:bg-green-400 text-black">
                          <Play className="h-6 w-6 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold truncate mb-1">{artist.name}</h3>
                    <p className="text-sm text-zinc-400 truncate">
                      {artist.followers_total?.toLocaleString()} followers
                    </p>
                  </Link>
                ))}
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

              {/* Show filtered results count */}
              {selectedGenre !== 'all' && (
                <div className="text-center mt-8 text-zinc-400">
                  <p>Showing {artists.length} artists for "{genres.find(g => g.value === selectedGenre)?.label}"</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
