"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Play, ChevronLeft, Loader2 } from "lucide-react"

import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { usePlayer } from "@/contexts/player-context"
import { musicAPI, Track } from "@/lib/music-api"

export default function TrackPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const player = usePlayer()
  const [track, setTrack] = useState<Track | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return
        const t = await musicAPI.getTrack(id)
        try {
          const album = await musicAPI.getAlbum(t.album_id)
          t.album_images = album.images || []
        } catch {}
        setTrack(t)
        player.play(t, { queue: [t], autoplay: true })
      } catch (e) {
        // If track not found, go home
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="px-4 sm:px-6 md:px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" className="hidden sm:flex rounded-full h-10 w-10" onClick={() => router.back()}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold">Track</h1>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading track...
            </div>
          ) : track ? (
            <div className="flex items-center gap-6">
              <div className="relative w-28 h-28 bg-zinc-800 rounded overflow-hidden">
                {track.album_images && track.album_images.length > 0 ? (
                  <Image src={track.album_images[0].url} alt={track.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🎵</div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-semibold truncate">{track.name}</div>
                <div className="text-sm text-zinc-400 truncate">{(track.artists || []).join(", ")}</div>
                <Button
                  className="mt-4 bg-green-500 hover:bg-green-400 text-black"
                  onClick={() => player.play(track, { queue: [track], autoplay: true })}
                >
                  <Play className="h-4 w-4 mr-2" /> Play
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-zinc-400">Track not found.</div>
          )}
        </div>
      </main>
    </div>
  )
}


