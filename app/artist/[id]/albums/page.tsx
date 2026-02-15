"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Play, Loader2, Disc3, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { musicAPI, Artist, Album } from "@/lib/music-api"
import { formatAlbumInfo } from "@/lib/date-utils"

export default function ArtistAlbumsPage({ params }: { params: Promise<{ id: string }> }) {
  const [artist, setArtist] = useState<Artist | null>(null)
  const [albums, setAlbums] = useState<Album[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [artistId, setArtistId] = useState<string | null>(null)

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
        const [artistData, albumsData] = await Promise.all([
          musicAPI.getArtist(artistId),
          musicAPI.getArtistAlbums(artistId)
        ])
        setArtist(artistData)
        setAlbums(albumsData)
      } catch (err) {
        console.error('Error loading artist albums:', err)
        setError('Failed to load artist albums')
      } finally {
        setIsLoading(false)
      }
    }

    loadArtistData()
  }, [artistId])

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
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{artist.name}</h1>
              <p className="text-sm text-zinc-400">{albums.length} albums</p>
            </div>
          </div>
        </div>

        {/* Albums Grid */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
            {albums.map((album) => (
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
                <h3 className="font-semibold truncate mb-1 text-sm sm:text-base">{album.name}</h3>
                <p className="text-xs sm:text-sm text-zinc-400 truncate">
                  {formatAlbumInfo(album.release_date, album.album_type)}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {album.total_tracks} {album.total_tracks === 1 ? 'track' : 'tracks'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
