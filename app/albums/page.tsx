"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Play, Loader2, ChevronLeft, Disc3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePlayer } from "@/contexts/player-context"
import { Sidebar } from "@/components/sidebar"
import { musicAPI, Album } from "@/lib/music-api"
import { formatAlbumInfo } from "@/lib/date-utils"

export default function AlbumsPage() {
  const player = usePlayer()
  const [albums, setAlbums] = useState<Album[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const lastFocusReloadAt = useRef(0)

  useEffect(() => {
    loadAlbums()
  }, [])

  const loadAlbums = async (pageNum = 1) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/proxy/albums?sort=popularity&order=desc&limit=24&page=${pageNum}`)
      const data = await response.json()
      
      if (pageNum === 1) {
        setAlbums(data.data || [])
      } else {
        setAlbums(prev => {
          // Deduplicate albums by ID to prevent duplicate key errors
          const existingIds = new Set(prev.map(album => album.id))
          const newAlbums = (data.data || []).filter(album => !existingIds.has(album.id))
          return [...prev, ...newAlbums]
        })
      }
      
      setHasMore(data.pagination?.page < data.pagination?.pages)
      setPage(pageNum)
      if ((data.data || []).length === 0 && pageNum === 1) scheduleRetry()
    } catch (error) {
      console.error("Error loading albums:", error)
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
      loadAlbums(1)
    }, delay)
  }

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadAlbums(page + 1)
    }
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
              <h1 className="text-3xl md:text-4xl font-black mb-2">Popular Albums</h1>
              <p className="text-zinc-400">Discover the most popular albums</p>
            </div>
          </div>

          {/* Albums Grid */}
          {albums.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="p-4 rounded-lg">
                  <div className="mb-4"><Skeleton className="aspect-square rounded-lg" /></div>
                  <Skeleton className="h-4 w-4/5 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {albums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/album/${album.id}`}
                    className="group p-4 rounded-lg hover:bg-white/5 transition-colors"
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
                    <h3 className="font-semibold truncate mb-1">{album.name}</h3>
                    <p className="text-sm text-zinc-400 truncate">
                      {formatAlbumInfo(album.release_date, album.album_type)}
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
            </>
          )}
        </div>
      </main>
    </div>
  )
}
